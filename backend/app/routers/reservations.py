from typing import Optional
from fastapi import APIRouter, HTTPException, Query, status
from app.db.connection import db_manager
from app.schemas.reservation import ReservationCreate

router = APIRouter(prefix="/reservations", tags=["Reservations"])

@router.get("")
def get_reservations(
    search: Optional[str] = None,
    student_id: Optional[int] = None,
    book_id: Optional[int] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100)
):
    offset = (page - 1) * limit
    where_clauses = []
    params = []

    if search:
        s = f"%{search}%"
        where_clauses.append("(p.name LIKE %s OR b.title LIKE %s OR p.email LIKE %s)")
        params.extend([s, s, s])

    if student_id:
        where_clauses.append("r.student_id = %s")
        params.append(student_id)

    if book_id:
        where_clauses.append("r.book_id = %s")
        params.append(book_id)

    where_sql = ("WHERE " + " AND ".join(where_clauses)) if where_clauses else ""

    count_query = f"""
        SELECT COUNT(*) AS total
        FROM RESERVES r
        JOIN STUDENT s ON r.student_id = s.student_id
        JOIN PERSON p ON s.student_id = p.person_id
        JOIN BOOK b ON r.book_id = b.book_id
        {where_sql}
    """
    total_res = db_manager.query(count_query, tuple(params), fetch_one=True)
    total_count = total_res["total"] if total_res else 0

    query = f"""
        SELECT 
            r.student_id,
            p.name AS student_name,
            p.email AS student_email,
            r.book_id,
            b.title AS book_title,
            b.copies_available,
            r.reserve_date
        FROM RESERVES r
        JOIN STUDENT s ON r.student_id = s.student_id
        JOIN PERSON p ON s.student_id = p.person_id
        JOIN BOOK b ON r.book_id = b.book_id
        {where_sql}
        ORDER BY r.reserve_date DESC
        LIMIT %s OFFSET %s
    """
    items = db_manager.query(query, tuple(params + [limit, offset]))

    for item in items:
        item["reserve_date"] = str(item["reserve_date"])

    return {
        "items": items,
        "total": total_count,
        "page": page,
        "limit": limit,
        "total_pages": (total_count + limit - 1) // limit if limit > 0 else 1
    }

@router.post("", status_code=status.HTTP_201_CREATED)
def create_reservation(req: ReservationCreate):
    # Verify student exists
    stu = db_manager.query("SELECT student_id FROM STUDENT WHERE student_id = %s", (req.student_id,), fetch_one=True)
    if not stu:
        raise HTTPException(status_code=404, detail="Student not found")

    # Verify book exists
    book = db_manager.query("SELECT book_id FROM BOOK WHERE book_id = %s", (req.book_id,), fetch_one=True)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    # Check composite primary key duplicate
    existing = db_manager.query("SELECT * FROM RESERVES WHERE student_id = %s AND book_id = %s", (req.student_id, req.book_id), fetch_one=True)
    if existing:
        raise HTTPException(status_code=400, detail="Student already has an active reservation for this book (composite key duplicate).")

    insert_sql = "INSERT INTO RESERVES (student_id, book_id) VALUES (%s, %s)"
    db_manager.execute(insert_sql, (req.student_id, req.book_id))
    return {"message": "Reservation created successfully", "student_id": req.student_id, "book_id": req.book_id}

@router.delete("/{student_id}/{book_id}")
def cancel_reservation(student_id: int, book_id: int):
    existing = db_manager.query("SELECT * FROM RESERVES WHERE student_id = %s AND book_id = %s", (student_id, book_id), fetch_one=True)
    if not existing:
        raise HTTPException(status_code=404, detail="Reservation not found")

    db_manager.execute("DELETE FROM RESERVES WHERE student_id = %s AND book_id = %s", (student_id, book_id))
    return {"message": "Reservation cancelled successfully"}
