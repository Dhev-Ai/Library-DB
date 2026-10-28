from typing import Optional
from fastapi import APIRouter, HTTPException, Query, status
from app.db.connection import db_manager
from app.schemas.fine import FineStatusUpdate

router = APIRouter(prefix="/fines", tags=["Fines & Payments"])

@router.get("")
def get_fines(
    search: Optional[str] = None,
    paid_status: Optional[str] = None, # 'Unpaid', 'Paid', 'Waived'
    fine_type: Optional[str] = None, # 'overdue', 'damage'
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100)
):
    offset = (page - 1) * limit
    where_clauses = []
    params = []

    if search:
        s = f"%{search}%"
        where_clauses.append("(p.name LIKE %s OR b.title LIKE %s OR CAST(f.fine_id AS CHAR) = %s)")
        params.extend([s, s, search])

    if paid_status:
        where_clauses.append("f.paid_status = %s")
        params.append(paid_status)

    if fine_type:
        if fine_type.lower() == "damage":
            where_clauses.append("df.fine_id IS NOT NULL")
        elif fine_type.lower() == "overdue":
            where_clauses.append("ofn.fine_id IS NOT NULL")

    where_sql = ("WHERE " + " AND ".join(where_clauses)) if where_clauses else ""

    count_query = f"""
        SELECT COUNT(f.fine_id) AS total
        FROM FINE f
        JOIN LENDING_RECORD lr ON f.lending_id = lr.lending_id
        JOIN STUDENT s ON lr.student_id = s.student_id
        JOIN PERSON p ON s.student_id = p.person_id
        JOIN BOOK b ON lr.book_id = b.book_id
        LEFT JOIN DAMAGE_FINE df ON f.fine_id = df.fine_id
        LEFT JOIN OVERDUE_FINE ofn ON f.fine_id = ofn.fine_id
        {where_sql}
    """
    total_res = db_manager.query(count_query, tuple(params), fetch_one=True)
    total_count = total_res["total"] if total_res else 0

    query = f"""
        SELECT 
            f.fine_id,
            f.lending_id,
            lr.student_id,
            p.name AS student_name,
            p.email AS student_email,
            lr.book_id,
            b.title AS book_title,
            f.amount,
            f.paid_status,
            lr.issue_date,
            lr.due_date,
            lr.return_date,
            df.damage_note,
            ofn.days_overdue,
            CASE 
                WHEN df.fine_id IS NOT NULL THEN 'Damage'
                WHEN ofn.fine_id IS NOT NULL THEN 'Overdue'
                ELSE 'Standard Fine'
            END AS fine_type
        FROM FINE f
        JOIN LENDING_RECORD lr ON f.lending_id = lr.lending_id
        JOIN STUDENT s ON lr.student_id = s.student_id
        JOIN PERSON p ON s.student_id = p.person_id
        JOIN BOOK b ON lr.book_id = b.book_id
        LEFT JOIN DAMAGE_FINE df ON f.fine_id = df.fine_id
        LEFT JOIN OVERDUE_FINE ofn ON f.fine_id = ofn.fine_id
        {where_sql}
        ORDER BY f.fine_id DESC
        LIMIT %s OFFSET %s
    """
    items = db_manager.query(query, tuple(params + [limit, offset]))

    for item in items:
        item["amount"] = float(item["amount"])
        item["issue_date"] = str(item["issue_date"])
        item["due_date"] = str(item["due_date"])
        item["return_date"] = str(item["return_date"]) if item["return_date"] else None

    # Summary totals
    summary = db_manager.query("""
        SELECT 
            COALESCE(SUM(CASE WHEN paid_status = 'Unpaid' THEN amount ELSE 0 END), 0) AS total_unpaid,
            COALESCE(SUM(CASE WHEN paid_status = 'Paid' THEN amount ELSE 0 END), 0) AS total_paid,
            COALESCE(SUM(CASE WHEN paid_status = 'Waived' THEN amount ELSE 0 END), 0) AS total_waived
        FROM FINE
    """, fetch_one=True) or {"total_unpaid": 0, "total_paid": 0, "total_waived": 0}

    return {
        "items": items,
        "total": total_count,
        "page": page,
        "limit": limit,
        "total_pages": (total_count + limit - 1) // limit if limit > 0 else 1,
        "summary": {
            "total_unpaid": float(summary["total_unpaid"]),
            "total_paid": float(summary["total_paid"]),
            "total_waived": float(summary["total_waived"])
        }
    }

@router.patch("/{fine_id}/status")
def update_fine_status(fine_id: int, req: FineStatusUpdate):
    existing = db_manager.query("SELECT * FROM FINE WHERE fine_id = %s", (fine_id,), fetch_one=True)
    if not existing:
        raise HTTPException(status_code=404, detail="Fine not found")

    db_manager.execute("UPDATE FINE SET paid_status = %s WHERE fine_id = %s", (req.paid_status, fine_id))
    return {"message": f"Fine status updated to {req.paid_status}", "fine_id": fine_id, "paid_status": req.paid_status}
