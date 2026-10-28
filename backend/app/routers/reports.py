from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, status
from app.core.dependencies import get_current_admin
from app.db.connection import db_manager
from app.schemas.report import ReportSaveRequest

router = APIRouter(prefix="/reports", tags=["Reports & Analytics"])

@router.get("/saved")
def get_saved_reports():
    query = """
        SELECT 
            r.report_id,
            r.report_type,
            r.generated_date,
            r.admin_id,
            p.name AS admin_name
        FROM REPORT r
        JOIN ADMIN a ON r.admin_id = a.admin_id
        JOIN PERSON p ON a.admin_id = p.person_id
        ORDER BY r.generated_date DESC
    """
    reports = db_manager.query(query)
    for rep in reports:
        rep["generated_date"] = str(rep["generated_date"])
    return reports

@router.post("/save", status_code=status.HTTP_201_CREATED)
def save_report_metadata(req: ReportSaveRequest, current_admin: dict = Depends(get_current_admin)):
    sql = "INSERT INTO REPORT (report_type, admin_id) VALUES (%s, %s)"
    report_id = db_manager.execute(sql, (req.report_type, current_admin["admin_id"]))
    return {"message": "Report logged successfully", "report_id": report_id, "report_type": req.report_type}

@router.get("/circulation-summary")
def get_circulation_summary():
    monthly = db_manager.query("""
        SELECT 
            SUBSTRING(issue_date, 1, 7) AS month,
            COUNT(*) AS total_issued,
            COUNT(CASE WHEN status = 'Returned' THEN 1 END) AS returned_count,
            COUNT(CASE WHEN status = 'Overdue' THEN 1 END) AS overdue_count,
            COUNT(CASE WHEN status = 'Damaged' THEN 1 END) AS damaged_count
        FROM LENDING_RECORD
        GROUP BY SUBSTRING(issue_date, 1, 7)
        ORDER BY month DESC
    """)
    return {"monthly_data": monthly}

@router.get("/overdue-defaulters")
def get_overdue_defaulters():
    defaulters = db_manager.query("""
        SELECT 
            s.student_id,
            p.name AS student_name,
            p.email,
            b.title AS book_title,
            lr.lending_id,
            lr.issue_date,
            lr.due_date,
            lr.status,
            f.amount AS fine_amount,
            f.paid_status
        FROM LENDING_RECORD lr
        JOIN STUDENT s ON lr.student_id = s.student_id
        JOIN PERSON p ON s.student_id = p.person_id
        JOIN BOOK b ON lr.book_id = b.book_id
        LEFT JOIN FINE f ON lr.lending_id = f.lending_id
        WHERE lr.status = 'Overdue' OR (lr.status = 'Issued' AND lr.due_date < CURDATE())
        ORDER BY lr.due_date ASC
    """)
    for d in defaulters:
        d["issue_date"] = str(d["issue_date"])
        d["due_date"] = str(d["due_date"])
        d["fine_amount"] = float(d["fine_amount"]) if d["fine_amount"] else 0.0
    return {"defaulters": defaulters}

@router.get("/damage-lost")
def get_damage_lost():
    damage_records = db_manager.query("""
        SELECT 
            lr.lending_id,
            b.book_id,
            b.title AS book_title,
            b.isbn,
            p.name AS student_name,
            lr.return_date,
            lr.status,
            f.amount AS fine_amount,
            f.paid_status,
            df.damage_note
        FROM LENDING_RECORD lr
        JOIN BOOK b ON lr.book_id = b.book_id
        JOIN PERSON p ON lr.student_id = p.person_id
        LEFT JOIN FINE f ON lr.lending_id = f.lending_id
        LEFT JOIN DAMAGE_FINE df ON f.fine_id = df.fine_id
        WHERE lr.status IN ('Damaged', 'Lost')
        ORDER BY lr.lending_id DESC
    """)
    for r in damage_records:
        r["return_date"] = str(r["return_date"]) if r["return_date"] else None
        r["fine_amount"] = float(r["fine_amount"]) if r["fine_amount"] else 0.0
    return {"damage_records": damage_records}

@router.get("/popular-books")
def get_popular_books():
    books = db_manager.query("""
        SELECT 
            b.book_id,
            b.title,
            b.author,
            b.copies_available,
            c.category_name,
            (SELECT COUNT(*) FROM LENDING_RECORD lr WHERE lr.book_id = b.book_id) AS total_borrows,
            (SELECT COUNT(*) FROM RESERVES r WHERE r.book_id = b.book_id) AS active_reservations
        FROM BOOK b
        JOIN CATEGORY c ON b.category_id = c.category_id
        ORDER BY total_borrows DESC, active_reservations DESC
    """)
    return {"popular_books": books}

@router.get("/fine-collections")
def get_fine_collections():
    collections = db_manager.query("""
        SELECT 
            paid_status,
            COUNT(*) AS count,
            COALESCE(SUM(amount), 0) AS total_amount
        FROM FINE
        GROUP BY paid_status
    """)
    for c in collections:
        c["total_amount"] = float(c["total_amount"])
    return {"collections": collections}

@router.get("/category-statistics")
def get_category_statistics():
    cats = db_manager.query("""
        SELECT 
            c.category_id,
            c.category_name,
            COUNT(b.book_id) AS title_count,
            COALESCE(SUM(b.copies_available), 0) AS total_copies,
            COUNT(lr.lending_id) AS total_lending_events
        FROM CATEGORY c
        LEFT JOIN BOOK b ON c.category_id = b.category_id
        LEFT JOIN LENDING_RECORD lr ON b.book_id = lr.book_id
        GROUP BY c.category_id, c.category_name
        ORDER BY title_count DESC
    """)
    return {"category_statistics": cats}
