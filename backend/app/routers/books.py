from typing import Optional
from fastapi import APIRouter, HTTPException, Query, status
from app.db.connection import db_manager
from app.schemas.book import BookCreate, BookUpdate

router = APIRouter(prefix="/books", tags=["Books & Catalog"])

@router.get("")
def get_books(
    search: Optional[str] = None,
    category_id: Optional[int] = None,
    classification: Optional[str] = None,
    sort_by: str = "book_id",
    sort_order: str = "desc",
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100)
):
    offset = (page - 1) * limit
    where_clauses = []
    params = []

    if search:
        s = f"%{search}%"
        where_clauses.append("(b.title LIKE %s OR b.author LIKE %s OR b.isbn LIKE %s OR CAST(b.book_id AS CHAR) = %s)")
        params.extend([s, s, s, search])

    if category_id:
        where_clauses.append("b.category_id = %s")
        params.append(category_id)

    if classification:
        if classification.lower() == "textbook":
            where_clauses.append("tb.book_id IS NOT NULL")
        elif classification.lower() == "reference":
            where_clauses.append("rb.book_id IS NOT NULL")
        elif classification.lower() == "journal":
            where_clauses.append("jn.book_id IS NOT NULL")
        elif classification.lower() == "standard":
            where_clauses.append("tb.book_id IS NULL AND rb.book_id IS NULL AND jn.book_id IS NULL")

    where_sql = ("WHERE " + " AND ".join(where_clauses)) if where_clauses else ""

    allowed_sort_cols = {
        "book_id": "b.book_id",
        "title": "b.title",
        "author": "b.author",
        "isbn": "b.isbn",
        "copies_available": "b.copies_available",
        "category_name": "c.category_name"
    }
    sort_col = allowed_sort_cols.get(sort_by, "b.book_id")
    order = "DESC" if sort_order.lower() == "desc" else "ASC"

    count_query = f"""
        SELECT COUNT(b.book_id) AS total
        FROM BOOK b
        JOIN CATEGORY c ON b.category_id = c.category_id
        LEFT JOIN TEXTBOOK tb ON b.book_id = tb.book_id
        LEFT JOIN REFERENCE_BOOK rb ON b.book_id = rb.book_id
        LEFT JOIN JOURNAL jn ON b.book_id = jn.book_id
        {where_sql}
    """
    total_res = db_manager.query(count_query, tuple(params), fetch_one=True)
    total_count = total_res["total"] if total_res else 0

    query = f"""
        SELECT 
            b.book_id,
            b.title,
            b.isbn,
            b.author,
            b.copies_available,
            b.category_id,
            c.category_name,
            tb.edition,
            rb.lendable,
            jn.issue_no,
            jn.volume_no,
            CASE 
                WHEN tb.book_id IS NOT NULL THEN 'Textbook'
                WHEN rb.book_id IS NOT NULL THEN 'Reference Book'
                WHEN jn.book_id IS NOT NULL THEN 'Journal'
                ELSE 'Standard Book'
            END AS subclass_type,
            CASE 
                WHEN tb.book_id IS NOT NULL THEN CONCAT('Textbook (Ed: ', tb.edition, ')')
                WHEN rb.book_id IS NOT NULL THEN CONCAT('Reference Book (Lendable: ', rb.lendable, ')')
                WHEN jn.book_id IS NOT NULL THEN CONCAT('Journal (Vol: ', jn.volume_no, ', Issue: ', jn.issue_no, ')')
                ELSE 'Standard Book'
            END AS catalog_classification
        FROM BOOK b
        JOIN CATEGORY c ON b.category_id = c.category_id
        LEFT JOIN TEXTBOOK tb ON b.book_id = tb.book_id
        LEFT JOIN REFERENCE_BOOK rb ON b.book_id = rb.book_id
        LEFT JOIN JOURNAL jn ON b.book_id = jn.book_id
        {where_sql}
        ORDER BY {sort_col} {order}
        LIMIT %s OFFSET %s
    """
    items = db_manager.query(query, tuple(params + [limit, offset]))

    return {
        "items": items,
        "total": total_count,
        "page": page,
        "limit": limit,
        "total_pages": (total_count + limit - 1) // limit if limit > 0 else 1
    }

@router.get("/{book_id}")
def get_book_details(book_id: int):
    query = """
        SELECT 
            b.book_id,
            b.title,
            b.isbn,
            b.author,
            b.copies_available,
            b.category_id,
            c.category_name,
            tb.edition,
            rb.lendable,
            jn.issue_no,
            jn.volume_no,
            CASE 
                WHEN tb.book_id IS NOT NULL THEN 'Textbook'
                WHEN rb.book_id IS NOT NULL THEN 'Reference Book'
                WHEN jn.book_id IS NOT NULL THEN 'Journal'
                ELSE 'Standard Book'
            END AS subclass_type
        FROM BOOK b
        JOIN CATEGORY c ON b.category_id = c.category_id
        LEFT JOIN TEXTBOOK tb ON b.book_id = tb.book_id
        LEFT JOIN REFERENCE_BOOK rb ON b.book_id = rb.book_id
        LEFT JOIN JOURNAL jn ON b.book_id = jn.book_id
        WHERE b.book_id = %s
    """
    book = db_manager.query(query, (book_id,), fetch_one=True)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    # Fetch lending history
    lending_history = db_manager.query("""
        SELECT 
            lr.lending_id,
            p.name AS student_name,
            p.email AS student_email,
            lr.issue_date,
            lr.due_date,
            lr.return_date,
            lr.status
        FROM LENDING_RECORD lr
        JOIN PERSON p ON lr.student_id = p.person_id
        WHERE lr.book_id = %s
        ORDER BY lr.issue_date DESC
    """, (book_id,))

    # Fetch active reservations
    reservations = db_manager.query("""
        SELECT 
            p.name AS student_name,
            p.email AS student_email,
            r.reserve_date
        FROM RESERVES r
        JOIN PERSON p ON r.student_id = p.person_id
        WHERE r.book_id = %s
        ORDER BY r.reserve_date ASC
    """, (book_id,))

    book["lending_history"] = lending_history
    book["reservations"] = reservations
    return book

@router.post("", status_code=status.HTTP_201_CREATED)
def create_book(book_data: BookCreate):
    # Check ISBN uniqueness
    existing = db_manager.query("SELECT book_id FROM BOOK WHERE isbn = %s", (book_data.isbn,), fetch_one=True)
    if existing:
        raise HTTPException(status_code=400, detail=f"Book with ISBN '{book_data.isbn}' already exists")

    # Check category existence
    cat = db_manager.query("SELECT category_id FROM CATEGORY WHERE category_id = %s", (book_data.category_id,), fetch_one=True)
    if not cat:
        raise HTTPException(status_code=400, detail="Specified category does not exist")

    # Insert BOOK
    insert_book = """
        INSERT INTO BOOK (title, isbn, author, copies_available, category_id)
        VALUES (%s, %s, %s, %s, %s)
    """
    book_id = db_manager.execute(insert_book, (
        book_data.title,
        book_data.isbn,
        book_data.author,
        book_data.copies_available,
        book_data.category_id
    ))

    # Handle subclass table insertion
    if book_data.subclass_type == "textbook":
        edition = book_data.edition or "1st Edition"
        db_manager.execute("INSERT INTO TEXTBOOK (book_id, edition) VALUES (%s, %s)", (book_id, edition))
    elif book_data.subclass_type == "reference_book":
        db_manager.execute("INSERT INTO REFERENCE_BOOK (book_id, lendable) VALUES (%s, 'No')", (book_id,))
    elif book_data.subclass_type == "journal":
        issue = book_data.issue_no or 1
        vol = book_data.volume_no or 1
        db_manager.execute("INSERT INTO JOURNAL (book_id, issue_no, volume_no) VALUES (%s, %s, %s)", (book_id, issue, vol))

    return {"message": "Book created successfully", "book_id": book_id}

@router.put("/{book_id}")
def update_book(book_id: int, book_data: BookUpdate):
    existing = db_manager.query("SELECT * FROM BOOK WHERE book_id = %s", (book_id,), fetch_one=True)
    if not existing:
        raise HTTPException(status_code=404, detail="Book not found")

    if book_data.isbn and book_data.isbn != existing["isbn"]:
        duplicate = db_manager.query("SELECT book_id FROM BOOK WHERE isbn = %s AND book_id != %s", (book_data.isbn, book_id), fetch_one=True)
        if duplicate:
            raise HTTPException(status_code=400, detail=f"Book with ISBN '{book_data.isbn}' already exists")

    fields = []
    params = []
    if book_data.title is not None:
        fields.append("title = %s")
        params.append(book_data.title)
    if book_data.isbn is not None:
        fields.append("isbn = %s")
        params.append(book_data.isbn)
    if book_data.author is not None:
        fields.append("author = %s")
        params.append(book_data.author)
    if book_data.copies_available is not None:
        fields.append("copies_available = %s")
        params.append(book_data.copies_available)
    if book_data.category_id is not None:
        fields.append("category_id = %s")
        params.append(book_data.category_id)

    if fields:
        params.append(book_id)
        update_sql = f"UPDATE BOOK SET {', '.join(fields)} WHERE book_id = %s"
        db_manager.execute(update_sql, tuple(params))

    # Update subclass tables if present
    if book_data.edition:
        db_manager.execute("INSERT INTO TEXTBOOK (book_id, edition) VALUES (%s, %s) ON DUPLICATE KEY UPDATE edition = %s", (book_id, book_data.edition, book_data.edition))
    if book_data.issue_no is not None and book_data.volume_no is not None:
        db_manager.execute("INSERT INTO JOURNAL (book_id, issue_no, volume_no) VALUES (%s, %s, %s) ON DUPLICATE KEY UPDATE issue_no = %s, volume_no = %s", (book_id, book_data.issue_no, book_data.volume_no, book_data.issue_no, book_data.volume_no))

    return {"message": "Book updated successfully", "book_id": book_id}

@router.delete("/{book_id}")
def delete_book(book_id: int):
    # Check if book exists
    existing = db_manager.query("SELECT * FROM BOOK WHERE book_id = %s", (book_id,), fetch_one=True)
    if not existing:
        raise HTTPException(status_code=404, detail="Book not found")

    # Check ON DELETE RESTRICT on LENDING_RECORD
    active_lending = db_manager.query("SELECT COUNT(*) AS cnt FROM LENDING_RECORD WHERE book_id = %s", (book_id,), fetch_one=True)
    if active_lending and active_lending["cnt"] > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete book: {active_lending['cnt']} historical lending record(s) reference this book (FK Restrict constraint)."
        )

    try:
        db_manager.execute("DELETE FROM BOOK WHERE book_id = %s", (book_id,))
        return {"message": "Book deleted successfully", "book_id": book_id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Database error while deleting: {str(e)}")
