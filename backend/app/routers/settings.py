from typing import Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from app.core.config import settings
from app.core.dependencies import get_current_admin
from app.db.connection import db_manager

router = APIRouter(prefix="/settings", tags=["Settings & Policies"])

class PolicyUpdateRequest(BaseModel):
    daily_overdue_rate: float = Field(..., gt=0)
    currency_symbol: str = Field(..., min_length=1, max_length=5)

@router.get("/policy")
def get_policy():
    return {
        "daily_overdue_rate": settings.DAILY_OVERDUE_RATE,
        "currency_symbol": settings.CURRENCY_SYMBOL,
        "undergraduate_borrow_limit": 3,
        "postgraduate_borrow_limit": 6,
        "reference_book_lendable": "No"
    }

@router.put("/policy")
def update_policy(req: PolicyUpdateRequest, current_admin: dict = Depends(get_current_admin)):
    settings.DAILY_OVERDUE_RATE = req.daily_overdue_rate
    settings.CURRENCY_SYMBOL = req.currency_symbol
    return {
        "message": "Circulation policy updated successfully",
        "daily_overdue_rate": settings.DAILY_OVERDUE_RATE,
        "currency_symbol": settings.CURRENCY_SYMBOL
    }

@router.get("/global-search")
def global_search(q: str):
    if not q or len(q.strip()) < 2:
        return {"books": [], "students": [], "lending": []}
    
    term = f"%{q.strip()}%"
    
    # 1. Search books
    books = db_manager.query("""
        SELECT book_id, title, author, isbn, copies_available
        FROM BOOK
        WHERE title LIKE %s OR author LIKE %s OR isbn LIKE %s OR CAST(book_id AS CHAR) = %s
        LIMIT 5
    """, (term, term, term, q.strip()))

    # 2. Search students
    students = db_manager.query("""
        SELECT s.student_id, p.name, p.email, s.department
        FROM STUDENT s
        JOIN PERSON p ON s.student_id = p.person_id
        WHERE p.name LIKE %s OR p.email LIKE %s OR CAST(s.student_id AS CHAR) = %s
        LIMIT 5
    """, (term, term, q.strip()))

    # 3. Search lending
    lending = db_manager.query("""
        SELECT lr.lending_id, p.name AS student_name, b.title AS book_title, lr.status, lr.due_date
        FROM LENDING_RECORD lr
        JOIN PERSON p ON lr.student_id = p.person_id
        JOIN BOOK b ON lr.book_id = b.book_id
        WHERE p.name LIKE %s OR b.title LIKE %s OR CAST(lr.lending_id AS CHAR) = %s
        LIMIT 5
    """, (term, term, q.strip()))

    return {
        "books": books,
        "students": students,
        "lending": lending
    }
