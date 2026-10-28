from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from app.core.security import decode_token
from app.db.connection import db_manager

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def get_current_admin(token: str = Depends(oauth2_scheme)) -> dict:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate admin credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_token(token)
    if not payload:
        raise credentials_exception
    username: str = payload.get("sub")
    if not username or username.startswith("student_"):
        raise credentials_exception

    query = """
    SELECT a.admin_id, a.username, p.name, p.email
    FROM ADMIN a
    JOIN PERSON p ON a.admin_id = p.person_id
    WHERE a.username = %s
    """
    admin = db_manager.query(query, (username,), fetch_one=True)
    if not admin:
        raise credentials_exception
    return admin

def get_current_student(token: str = Depends(oauth2_scheme)) -> dict:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate student credentials. Please log in as a student.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_token(token)
    if not payload:
        raise credentials_exception
    
    student_id = payload.get("student_id")
    if not student_id:
        sub = str(payload.get("sub", ""))
        if sub.startswith("student_"):
            try:
                student_id = int(sub.split("_")[1])
            except (ValueError, IndexError):
                pass

    if not student_id:
        raise credentials_exception

    query = """
    SELECT s.student_id, p.name, p.email, s.department, s.join_year,
           CASE WHEN ug.student_id IS NOT NULL THEN 'Undergraduate' ELSE 'Postgraduate' END as student_type,
           COALESCE(ug.borrow_limit, pg.borrow_limit, 3) as borrow_limit,
           pg.research_area
    FROM STUDENT s
    JOIN PERSON p ON s.student_id = p.person_id
    LEFT JOIN UNDERGRADUATE ug ON s.student_id = ug.student_id
    LEFT JOIN POSTGRADUATE pg ON s.student_id = pg.student_id
    WHERE s.student_id = %s
    """
    student = db_manager.query(query, (student_id,), fetch_one=True)
    if not student:
        raise credentials_exception
    return student

