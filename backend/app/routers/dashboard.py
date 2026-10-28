from fastapi import APIRouter, Depends
from app.core.dependencies import get_current_admin
from app.db.connection import db_manager

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/summary")
def get_dashboard_summary():
    # 1. Total Catalog Titles & Available Copies
    book_stats = db_manager.query("""
        SELECT 
            COUNT(*) AS total_titles,
            COALESCE(SUM(copies_available), 0) AS total_copies
        FROM BOOK
    """, fetch_one=True) or {"total_titles": 0, "total_copies": 0}

    # 2. Registered Students (Total, UG, PG)
    student_stats = db_manager.query("""
        SELECT 
            COUNT(s.student_id) AS total_students,
            COUNT(ug.student_id) AS ug_students,
            COUNT(pg.student_id) AS pg_students
        FROM STUDENT s
        LEFT JOIN UNDERGRADUATE ug ON s.student_id = ug.student_id
        LEFT JOIN POSTGRADUATE pg ON s.student_id = pg.student_id
    """, fetch_one=True) or {"total_students": 0, "ug_students": 0, "pg_students": 0}

    # 3. Lending Stats (Issued, Overdue)
    lending_stats = db_manager.query("""
        SELECT 
            COUNT(CASE WHEN status = 'Issued' THEN 1 END) AS active_issued,
            COUNT(CASE WHEN status = 'Overdue' THEN 1 END) AS overdue_count,
            COUNT(CASE WHEN status = 'Returned' THEN 1 END) AS returned_count,
            COUNT(CASE WHEN status = 'Damaged' THEN 1 END) AS damaged_count,
            COUNT(CASE WHEN status = 'Lost' THEN 1 END) AS lost_count
        FROM LENDING_RECORD
    """, fetch_one=True) or {"active_issued": 0, "overdue_count": 0, "returned_count": 0, "damaged_count": 0, "lost_count": 0}

    # 4. Reservations
    res_count = db_manager.query("SELECT COUNT(*) AS total_reservations FROM RESERVES", fetch_one=True)
    total_reservations = res_count["total_reservations"] if res_count else 0

    # 5. Fines (Unpaid, Paid, Waived)
    fine_stats = db_manager.query("""
        SELECT 
            COALESCE(SUM(CASE WHEN paid_status = 'Unpaid' THEN amount ELSE 0 END), 0) AS unpaid_total,
            COALESCE(SUM(CASE WHEN paid_status = 'Paid' THEN amount ELSE 0 END), 0) AS paid_total,
            COALESCE(SUM(CASE WHEN paid_status = 'Waived' THEN amount ELSE 0 END), 0) AS waived_total,
            COUNT(CASE WHEN paid_status = 'Unpaid' THEN 1 END) AS unpaid_count,
            COUNT(CASE WHEN paid_status = 'Paid' THEN 1 END) AS paid_count
        FROM FINE
    """, fetch_one=True) or {"unpaid_total": 0, "paid_total": 0, "waived_total": 0, "unpaid_count": 0, "paid_count": 0}

    # 6. Total Admins
    admin_count = db_manager.query("SELECT COUNT(*) AS total_admins FROM ADMIN", fetch_one=True)
    total_admins = admin_count["total_admins"] if admin_count else 0

    # 7. Category Distribution Chart
    category_distribution = db_manager.query("""
        SELECT 
            c.category_name,
            COUNT(b.book_id) AS book_count,
            COALESCE(SUM(b.copies_available), 0) AS total_copies
        FROM CATEGORY c
        LEFT JOIN BOOK b ON c.category_id = b.category_id
        GROUP BY c.category_id, c.category_name
        ORDER BY book_count DESC
    """)

    # 8. Lending Status Distribution
    status_distribution = [
        {"name": "Issued", "value": lending_stats["active_issued"]},
        {"name": "Overdue", "value": lending_stats["overdue_count"]},
        {"name": "Returned", "value": lending_stats["returned_count"]},
        {"name": "Damaged", "value": lending_stats["damaged_count"]},
        {"name": "Lost", "value": lending_stats["lost_count"]}
    ]

    # 9. Lending Over Time
    lending_timeline = db_manager.query("""
        SELECT 
            issue_date AS date,
            COUNT(*) AS count
        FROM LENDING_RECORD
        GROUP BY issue_date
        ORDER BY issue_date ASC
        LIMIT 14
    """)

    # 10. Recently Issued Books
    recent_issued = db_manager.query("""
        SELECT 
            lr.lending_id,
            b.title AS book_title,
            p.name AS student_name,
            lr.issue_date,
            lr.due_date,
            lr.status
        FROM LENDING_RECORD lr
        JOIN BOOK b ON lr.book_id = b.book_id
        JOIN PERSON p ON lr.student_id = p.person_id
        ORDER BY lr.lending_id DESC
        LIMIT 5
    """)

    # 11. Upcoming Due Dates & Overdue Items
    overdue_items = db_manager.query("""
        SELECT 
            lr.lending_id,
            b.title AS book_title,
            p.name AS student_name,
            p.email AS student_email,
            lr.due_date,
            lr.status
        FROM LENDING_RECORD lr
        JOIN BOOK b ON lr.book_id = b.book_id
        JOIN PERSON p ON lr.student_id = p.person_id
        WHERE lr.status IN ('Overdue', 'Issued')
        ORDER BY lr.due_date ASC
        LIMIT 5
    """)

    # 12. Recent Reservations
    recent_reservations = db_manager.query("""
        SELECT 
            p.name AS student_name,
            b.title AS book_title,
            r.reserve_date,
            b.copies_available
        FROM RESERVES r
        JOIN PERSON p ON r.student_id = p.person_id
        JOIN BOOK b ON r.book_id = b.book_id
        ORDER BY r.reserve_date DESC
        LIMIT 5
    """)

    return {
        "kpis": {
            "total_titles": book_stats["total_titles"],
            "total_copies": book_stats["total_copies"],
            "total_students": student_stats["total_students"],
            "ug_students": student_stats["ug_students"],
            "pg_students": student_stats["pg_students"],
            "active_issued": lending_stats["active_issued"],
            "overdue_count": lending_stats["overdue_count"],
            "total_reservations": total_reservations,
            "unpaid_fines_total": float(fine_stats["unpaid_total"]),
            "paid_fines_total": float(fine_stats["paid_total"]),
            "total_admins": total_admins
        },
        "category_distribution": category_distribution,
        "status_distribution": status_distribution,
        "lending_timeline": lending_timeline,
        "recent_issued": recent_issued,
        "overdue_items": overdue_items,
        "recent_reservations": recent_reservations
    }
