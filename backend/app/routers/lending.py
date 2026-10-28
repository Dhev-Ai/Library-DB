from datetime import date, datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, Query, Depends, status
from app.core.dependencies import get_current_admin
from app.core.config import settings
from app.db.connection import db_manager
from app.schemas.lending import LendingIssueRequest, LendingReturnRequest

router = APIRouter(prefix="/lending", tags=["Lending & Returns"])

@router.get("")
def get_lending_records(
    search: Optional[str] = None,
    status_filter: Optional[str] = None,
    student_id: Optional[int] = None,
    book_id: Optional[int] = None,
    overdue_only: bool = False,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100)
):
    offset = (page - 1) * limit
    where_clauses = []
    params = []

    if search:
        s = f"%{search}%"
        where_clauses.append("(p_stu.name LIKE %s OR b.title LIKE %s OR CAST(lr.lending_id AS CHAR) = %s)")
        params.extend([s, s, search])

    if status_filter:
        where_clauses.append("lr.status = %s")
        params.append(status_filter)

    if student_id:
        where_clauses.append("lr.student_id = %s")
        params.append(student_id)

    if book_id:
        where_clauses.append("lr.book_id = %s")
        params.append(book_id)

    if overdue_only:
        where_clauses.append("(lr.status = 'Overdue' OR (lr.status = 'Issued' AND lr.due_date < CURDATE()))")

    where_sql = ("WHERE " + " AND ".join(where_clauses)) if where_clauses else ""

    count_query = f"""
        SELECT COUNT(lr.lending_id) AS total
        FROM LENDING_RECORD lr
        JOIN STUDENT s ON lr.student_id = s.student_id
        JOIN PERSON p_stu ON s.student_id = p_stu.person_id
        JOIN BOOK b ON lr.book_id = b.book_id
        {where_sql}
    """
    total_res = db_manager.query(count_query, tuple(params), fetch_one=True)
    total_count = total_res["total"] if total_res else 0

    query = f"""
        SELECT 
            lr.lending_id,
            lr.student_id,
            p_stu.name AS student_name,
            lr.book_id,
            b.title AS book_title,
            lr.admin_id,
            p_adm.name AS admin_name,
            lr.issue_date,
            lr.due_date,
            lr.return_date,
            lr.status,
            f.fine_id,
            f.amount AS fine_amount,
            f.paid_status AS fine_status,
            df.damage_note,
            ofn.days_overdue
        FROM LENDING_RECORD lr
        JOIN STUDENT s ON lr.student_id = s.student_id
        JOIN PERSON p_stu ON s.student_id = p_stu.person_id
        JOIN BOOK b ON lr.book_id = b.book_id
        JOIN ADMIN a ON lr.admin_id = a.admin_id
        JOIN PERSON p_adm ON a.admin_id = p_adm.person_id
        LEFT JOIN FINE f ON lr.lending_id = f.lending_id
        LEFT JOIN DAMAGE_FINE df ON f.fine_id = df.fine_id
        LEFT JOIN OVERDUE_FINE ofn ON f.fine_id = ofn.fine_id
        {where_sql}
        ORDER BY lr.lending_id DESC
        LIMIT %s OFFSET %s
    """
    records = db_manager.query(query, tuple(params + [limit, offset]))

    # Compute dynamic overdue days and fines for active items
    today_str = date.today().isoformat()
    for r in records:
        # Convert date objects to strings if needed
        r["issue_date"] = str(r["issue_date"])
        r["due_date"] = str(r["due_date"])
        r["return_date"] = str(r["return_date"]) if r["return_date"] else None

        if r["status"] in ("Issued", "Overdue") and not r["return_date"]:
            due_d = datetime.strptime(r["due_date"][:10], "%Y-%m-%d").date()
            today_d = date.today()
            if today_d > due_d:
                diff = (today_d - due_d).days
                r["days_overdue"] = diff
                r["calculated_overdue_fine"] = round(diff * settings.DAILY_OVERDUE_RATE, 2)
            else:
                r["days_overdue"] = 0
                r["calculated_overdue_fine"] = 0.0

    return {
        "items": records,
        "total": total_count,
        "page": page,
        "limit": limit,
        "total_pages": (total_count + limit - 1) // limit if limit > 0 else 1
    }

@router.post("/issue", status_code=status.HTTP_201_CREATED)
def issue_book(req: LendingIssueRequest, current_admin: dict = Depends(get_current_admin)):
    # 1. Verify Student
    student = db_manager.query("""
        SELECT 
            s.student_id,
            p.name,
            COALESCE(ug.borrow_limit, pg.borrow_limit, 3) AS max_limit
        FROM STUDENT s
        JOIN PERSON p ON s.student_id = p.person_id
        LEFT JOIN UNDERGRADUATE ug ON s.student_id = ug.student_id
        LEFT JOIN POSTGRADUATE pg ON s.student_id = pg.student_id
        WHERE s.student_id = %s
    """, (req.student_id,), fetch_one=True)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # 2. Verify Student Borrowing Limit
    active_borrows = db_manager.query("""
        SELECT COUNT(*) AS active_cnt
        FROM LENDING_RECORD
        WHERE student_id = %s AND status IN ('Issued', 'Overdue')
    """, (req.student_id,), fetch_one=True)
    active_count = active_borrows["active_cnt"] if active_borrows else 0
    if active_count >= student["max_limit"]:
        raise HTTPException(
            status_code=400,
            detail=f"Borrowing limit reached: Student has {active_count} active book(s) out of allowed maximum {student['max_limit']}."
        )

    # 3. Verify Book and Copies
    book = db_manager.query("SELECT * FROM BOOK WHERE book_id = %s", (req.book_id,), fetch_one=True)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    if book["copies_available"] <= 0:
        raise HTTPException(status_code=400, detail="Cannot issue book: No copies available in stock.")

    # 4. Verify Not a Non-lendable Reference Book
    ref_book = db_manager.query("SELECT * FROM REFERENCE_BOOK WHERE book_id = %s", (req.book_id,), fetch_one=True)
    if ref_book and ref_book["lendable"] == "No":
        raise HTTPException(
            status_code=400,
            detail="Cannot issue Reference Book: Reference books are restricted to in-library reading only (lendable = 'No')."
        )

    # 5. Validate Dates
    issue_date_str = req.issue_date or date.today().isoformat()
    if req.due_date < issue_date_str:
        raise HTTPException(status_code=400, detail="Due date cannot be earlier than issue date")

    # 6. Execute in transaction: Insert LENDING_RECORD & Decrement stock
    try:
        # Insert record
        lending_sql = """
            INSERT INTO LENDING_RECORD (issue_date, due_date, status, student_id, book_id, admin_id)
            VALUES (%s, %s, 'Issued', %s, %s, %s)
        """
        lending_id = db_manager.execute(lending_sql, (
            issue_date_str,
            req.due_date,
            req.student_id,
            req.book_id,
            current_admin["admin_id"]
        ))

        # Decrement stock
        db_manager.execute("UPDATE BOOK SET copies_available = copies_available - 1 WHERE book_id = %s", (req.book_id,))

        # Remove reservation if student had reserved this book
        db_manager.execute("DELETE FROM RESERVES WHERE student_id = %s AND book_id = %s", (req.student_id, req.book_id))

        return {
            "message": "Book issued successfully",
            "lending_id": lending_id,
            "book_id": req.book_id,
            "student_id": req.student_id
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Database transaction error: {str(e)}")

@router.post("/{lending_id}/return")
def return_book(lending_id: int, req: LendingReturnRequest, current_admin: dict = Depends(get_current_admin)):
    record = db_manager.query("SELECT * FROM LENDING_RECORD WHERE lending_id = %s", (lending_id,), fetch_one=True)
    if not record:
        raise HTTPException(status_code=404, detail="Lending record not found")

    if record["status"] in ("Returned", "Damaged", "Lost") and record["return_date"]:
        raise HTTPException(status_code=400, detail=f"Lending record is already marked as {record['status']}. Double return prevented.")

    return_date_str = req.return_date or date.today().isoformat()
    issue_date_str = str(record["issue_date"])[:10]
    if return_date_str < issue_date_str:
        raise HTTPException(status_code=400, detail="Return date cannot be earlier than issue date")

    # Determine overdue days
    due_date_str = str(record["due_date"])[:10]
    return_d = datetime.strptime(return_date_str, "%Y-%m-%d").date()
    due_d = datetime.strptime(due_date_str, "%Y-%m-%d").date()
    days_overdue = max(0, (return_d - due_d).days)

    final_status = req.status
    if final_status == "Returned" and days_overdue > 0:
        final_status = "Returned" # Returned late

    # Update LENDING_RECORD
    db_manager.execute("""
        UPDATE LENDING_RECORD 
        SET return_date = %s, status = %s 
        WHERE lending_id = %s
    """, (return_date_str, final_status, lending_id))

    # Increment stock if returned or damaged
    if final_status in ("Returned", "Damaged"):
        db_manager.execute("UPDATE BOOK SET copies_available = copies_available + 1 WHERE book_id = %s", (record["book_id"],))

    # Fine handling (idempotent 1:1 check)
    existing_fine = db_manager.query("SELECT fine_id FROM FINE WHERE lending_id = %s", (lending_id,), fetch_one=True)
    created_fine_id = None

    if not existing_fine:
        # Check if overdue fine applies
        if days_overdue > 0 and final_status != "Damaged":
            fine_amt = round(days_overdue * settings.DAILY_OVERDUE_RATE, 2)
            fine_id = db_manager.execute("""
                INSERT INTO FINE (amount, paid_status, lending_id)
                VALUES (%s, 'Unpaid', %s)
            """, (fine_amt, lending_id))
            db_manager.execute("INSERT INTO OVERDUE_FINE (fine_id, days_overdue) VALUES (%s, %s)", (fine_id, days_overdue))
            created_fine_id = fine_id
        elif final_status == "Damaged" and (req.damage_fine_amount or req.damage_note):
            damage_amt = req.damage_fine_amount or 35.00
            note = req.damage_note or "Book returned in damaged condition"
            fine_id = db_manager.execute("""
                INSERT INTO FINE (amount, paid_status, lending_id)
                VALUES (%s, 'Unpaid', %s)
            """, (damage_amt, lending_id))
            db_manager.execute("INSERT INTO DAMAGE_FINE (fine_id, damage_note) VALUES (%s, %s)", (fine_id, note))
            created_fine_id = fine_id

    return {
        "message": "Return processed successfully",
        "lending_id": lending_id,
        "status": final_status,
        "days_overdue": days_overdue,
        "fine_id": created_fine_id
    }
