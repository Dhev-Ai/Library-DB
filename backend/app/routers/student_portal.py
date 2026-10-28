from datetime import date, datetime, timedelta
from typing import Optional
from fastapi import APIRouter, HTTPException, Query, Depends, status
from pydantic import BaseModel
from app.core.dependencies import get_current_student
from app.core.config import settings
from app.db.connection import db_manager

router = APIRouter(prefix="/student-portal", tags=["Student Self-Service Portal"])

class StudentBorrowRequest(BaseModel):
    book_id: int

@router.get("/me")
def get_student_profile(student: dict = Depends(get_current_student)):
    # Calculate active borrows
    active_borrows = db_manager.query("""
        SELECT COUNT(*) as active_cnt
        FROM LENDING_RECORD
        WHERE student_id = %s AND status IN ('Issued', 'Overdue')
    """, (student["student_id"],), fetch_one=True)
    active_cnt = active_borrows["active_cnt"] if active_borrows else 0
    max_limit = student["borrow_limit"]

    return {
        **student,
        "active_borrows_count": active_cnt,
        "remaining_borrow_capacity": max(0, max_limit - active_cnt),
        "can_borrow_more": active_cnt < max_limit
    }

@router.get("/books")
def get_student_catalog(
    search: Optional[str] = None,
    category_id: Optional[int] = None,
    student: dict = Depends(get_current_student)
):
    where_clauses = []
    params = []

    if search:
        s = f"%{search}%"
        where_clauses.append("(b.title LIKE %s OR b.author LIKE %s OR b.isbn LIKE %s)")
        params.extend([s, s, s])

    if category_id:
        where_clauses.append("b.category_id = %s")
        params.append(category_id)

    where_sql = ("WHERE " + " AND ".join(where_clauses)) if where_clauses else ""

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
            END AS subclass_type
        FROM BOOK b
        JOIN CATEGORY c ON b.category_id = c.category_id
        LEFT JOIN TEXTBOOK tb ON b.book_id = tb.book_id
        LEFT JOIN REFERENCE_BOOK rb ON b.book_id = rb.book_id
        LEFT JOIN JOURNAL jn ON b.book_id = jn.book_id
        {where_sql}
        ORDER BY b.title ASC
    """
    books = db_manager.query(query, tuple(params))

    # Check which books this student currently has checked out
    current_loans = db_manager.query("""
        SELECT book_id 
        FROM LENDING_RECORD 
        WHERE student_id = %s AND status IN ('Issued', 'Overdue')
    """, (student["student_id"],))
    borrowed_book_ids = {r["book_id"] for r in current_loans} if current_loans else set()

    for b in books:
        b["is_currently_borrowed_by_me"] = b["book_id"] in borrowed_book_ids
        b["is_lendable"] = (b.get("lendable") != "No")
        b["can_borrow"] = (
            b["copies_available"] > 0 and 
            b["is_lendable"] and 
            not b["is_currently_borrowed_by_me"]
        )

    return books

@router.post("/borrow", status_code=status.HTTP_201_CREATED)
def student_borrow_book(req: StudentBorrowRequest, student: dict = Depends(get_current_student)):
    student_id = student["student_id"]
    book_id = req.book_id

    # 1. Check Student Borrow Limit
    active_borrows = db_manager.query("""
        SELECT COUNT(*) AS active_cnt
        FROM LENDING_RECORD
        WHERE student_id = %s AND status IN ('Issued', 'Overdue')
    """, (student_id,), fetch_one=True)
    active_count = active_borrows["active_cnt"] if active_borrows else 0
    max_limit = student["borrow_limit"]

    if active_count >= max_limit:
        raise HTTPException(
            status_code=400,
            detail=f"Borrowing limit reached: You have {active_count} active loan(s). Your degree ({student['student_type']}) allows a maximum of {max_limit} books at a time."
        )

    # 2. Check if student already has this book borrowed
    existing = db_manager.query("""
        SELECT lending_id FROM LENDING_RECORD 
        WHERE student_id = %s AND book_id = %s AND status IN ('Issued', 'Overdue')
    """, (student_id, book_id), fetch_one=True)
    if existing:
        raise HTTPException(status_code=400, detail="You currently have a copy of this book already issued to you.")

    # 3. Check Book & Available Stock
    book = db_manager.query("SELECT * FROM BOOK WHERE book_id = %s", (book_id,), fetch_one=True)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found in library catalog")

    if book["copies_available"] <= 0:
        raise HTTPException(status_code=400, detail=f"'{book['title']}' is currently out of stock (0 copies available).")

    # 4. Check Non-lendable Reference Book
    ref = db_manager.query("SELECT lendable FROM REFERENCE_BOOK WHERE book_id = %s", (book_id,), fetch_one=True)
    if ref and ref["lendable"] == "No":
        raise HTTPException(status_code=400, detail="Reference books are restricted to in-library reading only and cannot be checked out.")

    # 5. Get valid librarian admin_id for foreign key constraint
    admin = db_manager.query("SELECT admin_id FROM ADMIN ORDER BY admin_id ASC LIMIT 1", fetch_one=True)
    admin_id = admin["admin_id"] if admin else 9

    # 6. Execute atomic lending & MySQL decrement
    today_str = date.today().isoformat()
    due_date_str = (date.today() + timedelta(days=14)).isoformat()

    try:
        # Insert Lending Record
        insert_sql = """
            INSERT INTO LENDING_RECORD (issue_date, due_date, status, student_id, book_id, admin_id)
            VALUES (%s, %s, 'Issued', %s, %s, %s)
        """
        lending_id = db_manager.execute(insert_sql, (today_str, due_date_str, student_id, book_id, admin_id))

        # Decrement stock in MySQL
        db_manager.execute("UPDATE BOOK SET copies_available = copies_available - 1 WHERE book_id = %s", (book_id,))

        # Remove reservation if existed
        db_manager.execute("DELETE FROM RESERVES WHERE student_id = %s AND book_id = %s", (student_id, book_id))

        return {
            "message": f"Successfully borrowed '{book['title']}'!",
            "lending_id": lending_id,
            "book_title": book["title"],
            "issue_date": today_str,
            "due_date": due_date_str,
            "due_in_days": 14
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Database error during borrow: {str(e)}")

@router.post("/return/{lending_id}")
def student_return_book(lending_id: int, student: dict = Depends(get_current_student)):
    student_id = student["student_id"]

    record = db_manager.query("""
        SELECT lr.*, b.title 
        FROM LENDING_RECORD lr
        JOIN BOOK b ON lr.book_id = b.book_id
        WHERE lr.lending_id = %s AND lr.student_id = %s
    """, (lending_id, student_id), fetch_one=True)

    if not record:
        raise HTTPException(status_code=404, detail="Lending record not found or does not belong to you.")

    if record["status"] in ("Returned", "Damaged", "Lost") and record["return_date"]:
        raise HTTPException(status_code=400, detail="This book has already been returned.")

    today_str = date.today().isoformat()
    due_d = datetime.strptime(str(record["due_date"])[:10], "%Y-%m-%d").date()
    today_d = date.today()
    days_overdue = max(0, (today_d - due_d).days)

    try:
        # Update record
        db_manager.execute("""
            UPDATE LENDING_RECORD 
            SET return_date = %s, status = 'Returned' 
            WHERE lending_id = %s
        """, (today_str, lending_id))

        # Increment stock in MySQL
        db_manager.execute("UPDATE BOOK SET copies_available = copies_available + 1 WHERE book_id = %s", (record["book_id"],))

        # Check fine
        fine_msg = ""
        if days_overdue > 0:
            fine_amt = round(days_overdue * settings.DAILY_OVERDUE_RATE, 2)
            fine_id = db_manager.execute("""
                INSERT INTO FINE (amount, paid_status, lending_id)
                VALUES (%s, 'Unpaid', %s)
            """, (fine_amt, lending_id))
            db_manager.execute("INSERT INTO OVERDUE_FINE (fine_id, days_overdue) VALUES (%s, %s)", (fine_id, days_overdue))
            fine_msg = f" Note: Overdue by {days_overdue} day(s). Fine of ${fine_amt:.2f} logged."

        return {
            "message": f"Successfully returned '{record['title']}'!{fine_msg}",
            "days_overdue": days_overdue,
            "book_id": record["book_id"]
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Database error during return: {str(e)}")

@router.get("/my-loans")
def get_my_loans(student: dict = Depends(get_current_student)):
    query = """
        SELECT 
            lr.lending_id,
            lr.book_id,
            b.title as book_title,
            b.author as book_author,
            b.isbn,
            c.category_name,
            lr.issue_date,
            lr.due_date,
            lr.return_date,
            lr.status,
            f.fine_id,
            f.amount as fine_amount,
            f.paid_status as fine_status
        FROM LENDING_RECORD lr
        JOIN BOOK b ON lr.book_id = b.book_id
        JOIN CATEGORY c ON b.category_id = c.category_id
        LEFT JOIN FINE f ON lr.lending_id = f.lending_id
        WHERE lr.student_id = %s
        ORDER BY lr.lending_id DESC
    """
    records = db_manager.query(query, (student["student_id"],))

    today_d = date.today()
    for r in records:
        r["issue_date"] = str(r["issue_date"])
        r["due_date"] = str(r["due_date"])
        r["return_date"] = str(r["return_date"]) if r["return_date"] else None
        
        due_d = datetime.strptime(r["due_date"][:10], "%Y-%m-%d").date()
        if r["status"] in ("Issued", "Overdue") and not r["return_date"]:
            diff = (due_d - today_d).days
            r["days_remaining"] = diff
            r["is_overdue"] = diff < 0
            if diff < 0:
                r["status"] = "Overdue"
        else:
            r["days_remaining"] = 0
            r["is_overdue"] = False

    return records
