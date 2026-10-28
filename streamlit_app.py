"""Streamlit interface for the Library Lending Management System."""

from pathlib import Path
import sqlite3

import streamlit as st


ROOT = Path(__file__).resolve().parent
DATABASE = ROOT / "backend" / "library_lending.db"

st.set_page_config(
    page_title="Library lending management",
    page_icon=":material/local_library:",
    layout="wide",
    initial_sidebar_state="expanded",
)


@st.cache_resource
def get_connection() -> sqlite3.Connection:
    connection = sqlite3.connect(DATABASE, check_same_thread=False)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


@st.cache_data(ttl=30)
def read_query(query: str, params: tuple = ()) -> list[dict]:
    cursor = get_connection().execute(query, params)
    columns = [column[0] for column in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]


def execute_query(query: str, params: tuple = ()) -> None:
    connection = get_connection()
    connection.execute(query, params)
    connection.commit()
    read_query.clear()


def metric(label: str, value: object, help_text: str = "") -> None:
    st.metric(label, value, help=help_text or None)


def render_dashboard() -> None:
    st.title("Library executive dashboard")
    st.caption("Live metrics from the local SQLite fallback database.")
    kpis = read_query(
        """
        SELECT
          (SELECT COUNT(*) FROM BOOK) AS titles,
          (SELECT COALESCE(SUM(copies_available), 0) FROM BOOK) AS copies,
          (SELECT COUNT(*) FROM STUDENT) AS students,
          (SELECT COUNT(*) FROM LENDING_RECORD WHERE status IN ('Issued', 'Overdue')) AS active,
          (SELECT COUNT(*) FROM LENDING_RECORD WHERE status = 'Overdue') AS overdue,
          (SELECT COUNT(*) FROM RESERVES) AS reservations,
          (SELECT COALESCE(SUM(amount), 0) FROM FINE WHERE paid_status = 'Unpaid') AS unpaid_fines,
          (SELECT COUNT(*) FROM ADMIN) AS admins
        """
    )[0]
    columns = st.columns(4)
    for column, label, value in zip(
        columns,
        ["Catalog titles", "Available copies", "Registered students", "Active lending"],
        [kpis["titles"], kpis["copies"], kpis["students"], kpis["active"]],
    ):
        with column:
            metric(label, int(value))
    columns = st.columns(4)
    for column, label, value in zip(
        columns,
        ["Overdue records", "Reservations", "Outstanding fines", "Library staff"],
        [kpis["overdue"], kpis["reservations"], f"${kpis['unpaid_fines']:.2f}", kpis["admins"]],
    ):
        with column:
            metric(label, int(value) if isinstance(value, (int, float)) else value)

    left, right = st.columns(2)
    with left:
        st.subheader("Inventory by category")
        categories = read_query(
            """SELECT c.category_name AS category, COUNT(b.book_id) AS titles,
               COALESCE(SUM(b.copies_available), 0) AS copies
               FROM CATEGORY c LEFT JOIN BOOK b ON b.category_id = c.category_id
               GROUP BY c.category_id ORDER BY titles DESC"""
        )
        st.bar_chart(
            {row["category"]: {"titles": row["titles"], "copies": row["copies"]} for row in categories},
            width="stretch",
        )
    with right:
        st.subheader("Lending status")
        statuses = read_query(
            "SELECT status, COUNT(*) AS records FROM LENDING_RECORD GROUP BY status ORDER BY records DESC"
        )
        st.bar_chart({row["status"]: row["records"] for row in statuses}, width="stretch")

    st.subheader("Due dates and recent activity")
    due = read_query(
        """SELECT lr.lending_id, b.title AS book, p.name AS student,
           lr.issue_date, lr.due_date, lr.status
           FROM LENDING_RECORD lr
           JOIN BOOK b ON b.book_id = lr.book_id
           JOIN PERSON p ON p.person_id = lr.student_id
           WHERE lr.status IN ('Issued', 'Overdue')
           ORDER BY lr.due_date LIMIT 10"""
    )
    st.dataframe(due, width="stretch", hide_index=True)


def render_catalog() -> None:
    st.title("Catalog")
    search = st.text_input("Search by title, author, ISBN, or category", key="catalog_search")
    books = read_query(
        """SELECT b.book_id, b.title, b.author, b.isbn, c.category_name AS category,
           b.copies_available
           FROM BOOK b JOIN CATEGORY c ON c.category_id = b.category_id
           WHERE lower(b.title || ' ' || b.author || ' ' || b.isbn || ' ' || c.category_name)
           LIKE lower(?) ORDER BY b.title""",
        (f"%{search}%",),
    )
    st.dataframe(books, width="stretch", hide_index=True)


def render_students() -> None:
    st.title("Students")
    students = read_query(
        """SELECT p.person_id AS student_id, p.name, p.email, s.department, s.join_year,
           CASE WHEN ug.student_id IS NOT NULL THEN 'Undergraduate'
                WHEN pg.student_id IS NOT NULL THEN 'Postgraduate' ELSE 'Student' END AS level,
           CASE WHEN ug.student_id IS NOT NULL THEN 3 WHEN pg.student_id IS NOT NULL THEN 6 ELSE 0 END AS borrow_limit
           FROM PERSON p JOIN STUDENT s ON s.student_id = p.person_id
           LEFT JOIN UNDERGRADUATE ug ON ug.student_id = s.student_id
           LEFT JOIN POSTGRADUATE pg ON pg.student_id = s.student_id
           ORDER BY p.name"""
    )
    st.dataframe(students, width="stretch", hide_index=True)


def render_circulation() -> None:
    st.title("Circulation")
    tab, action = st.tabs(["Records", "Issue or return"])
    with tab:
        records = read_query(
            """SELECT lr.lending_id, b.title AS book, p.name AS student, a.username AS issued_by,
               lr.issue_date, lr.due_date, lr.return_date, lr.status
               FROM LENDING_RECORD lr JOIN BOOK b ON b.book_id = lr.book_id
               JOIN PERSON p ON p.person_id = lr.student_id JOIN ADMIN a ON a.admin_id = lr.admin_id
               ORDER BY lr.lending_id DESC"""
        )
        st.dataframe(records, width="stretch", hide_index=True)
    with action:
        st.info("Use these controls for local SQLite circulation updates. The FastAPI API remains available for the full production workflow.")
        active = read_query(
            "SELECT lending_id, title FROM LENDING_RECORD lr JOIN BOOK b ON b.book_id = lr.book_id WHERE lr.status IN ('Issued', 'Overdue') ORDER BY lending_id"
        )
        if active:
            selected = st.selectbox("Record to return", [row["lending_id"] for row in active])
            if st.button("Mark as returned", type="primary"):
                book_id = read_query("SELECT book_id FROM LENDING_RECORD WHERE lending_id = ?", (selected,))[0]["book_id"]
                execute_query(
                    "UPDATE LENDING_RECORD SET status = 'Returned', return_date = date('now') WHERE lending_id = ?",
                    (selected,),
                )
                execute_query("UPDATE BOOK SET copies_available = copies_available + 1 WHERE book_id = ?", (book_id,))
                st.success("The lending record was returned and inventory was restored.")
                st.rerun()


def render_fines() -> None:
    st.title("Fines and reservations")
    fines, reservations = st.tabs(["Fines", "Reservations"])
    with fines:
        data = read_query(
            """SELECT f.fine_id, f.amount, f.paid_status, f.lending_id,
               p.name AS student, b.title AS book
               FROM FINE f JOIN LENDING_RECORD lr ON lr.lending_id = f.lending_id
               JOIN PERSON p ON p.person_id = lr.student_id JOIN BOOK b ON b.book_id = lr.book_id
               ORDER BY f.fine_id DESC"""
        )
        st.dataframe(data, width="stretch", hide_index=True)
    with reservations:
        data = read_query(
            """SELECT p.name AS student, b.title AS book, r.reserve_date, b.copies_available
               FROM RESERVES r JOIN PERSON p ON p.person_id = r.student_id
               JOIN BOOK b ON b.book_id = r.book_id ORDER BY r.reserve_date DESC"""
        )
        st.dataframe(data, width="stretch", hide_index=True)


def render_database() -> None:
    st.title("Database explorer")
    tables = read_query(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    )
    table_names = [row["name"] for row in tables]
    table = st.selectbox("Table", table_names)
    data = read_query(f'SELECT * FROM "{table}" LIMIT 500')
    st.caption(f"{len(data)} rows shown (maximum 500).")
    st.dataframe(data, width="stretch", hide_index=True)


st.sidebar.title("Library lending")
st.sidebar.caption("Streamlit edition")
page = st.sidebar.segmented_control(
    "Navigate",
    ["Dashboard", "Catalog", "Students", "Circulation", "Fines", "Database"],
    default="Dashboard",
)
if page == "Dashboard":
    render_dashboard()
elif page == "Catalog":
    render_catalog()
elif page == "Students":
    render_students()
elif page == "Circulation":
    render_circulation()
elif page == "Fines":
    render_fines()
else:
    render_database()
