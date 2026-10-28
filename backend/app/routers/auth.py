from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from app.core.security import verify_password, create_access_token
from app.core.dependencies import get_current_admin
from app.core.config import settings
from app.db.connection import db_manager
from app.schemas.auth import (
    Token,
    AdminLogin,
    AdminResponse,
    StudentLogin,
    StudentToken,
    StudentSetupPassword,
    AdminSetupPassword,
    StudentLoginResponse
)
from app.core.security import verify_password, get_password_hash, create_access_token

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=Token)
def login(login_data: AdminLogin):
    # Query admin with person details
    query = """
    SELECT a.admin_id, a.username, a.password, p.name, p.email
    FROM ADMIN a
    JOIN PERSON p ON a.admin_id = p.person_id
    WHERE a.username = %s
    """
    admin = db_manager.query(query, (login_data.username,), fetch_one=True)
    if not admin:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect admin username or password"
        )
    
    if not verify_password(login_data.password, admin["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password. Access denied."
        )
    
    access_token = create_access_token(subject=admin["username"])
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "admin_id": admin["admin_id"],
        "username": admin["username"],
        "name": admin["name"]
    }

@router.post("/student-login", response_model=StudentLoginResponse)
def student_login(data: StudentLogin):
    identifier = data.identifier.strip()
    if not identifier:
        raise HTTPException(status_code=400, detail="Student ID or Institutional Email is required")
    
    query = """
    SELECT s.student_id, s.password, p.name, p.email, s.department, s.join_year,
           CASE WHEN ug.student_id IS NOT NULL THEN 'Undergraduate' ELSE 'Postgraduate' END as student_type,
           COALESCE(ug.borrow_limit, pg.borrow_limit, 3) as borrow_limit
    FROM STUDENT s
    JOIN PERSON p ON s.student_id = p.person_id
    LEFT JOIN UNDERGRADUATE ug ON s.student_id = ug.student_id
    LEFT JOIN POSTGRADUATE pg ON s.student_id = pg.student_id
    WHERE CAST(s.student_id AS CHAR) = %s OR LOWER(p.email) = LOWER(%s)
    """
    student = db_manager.query(query, (identifier, identifier), fetch_one=True)
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No student record found matching '{identifier}'. Check your Student ID or College Email."
        )

    # 1. First-time login: Password not set yet
    if not student["password"]:
        return {
            "needs_password_setup": True,
            "student_id": student["student_id"],
            "name": student["name"],
            "email": student["email"],
            "department": student["department"],
            "student_type": student["student_type"],
            "borrow_limit": student["borrow_limit"],
            "join_year": student["join_year"],
            "message": "First-time entry detected! Please set up your permanent password to continue."
        }

    # 2. Subsequent logins: Password is set, so password must be provided and must match!
    if not data.password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password is required. Please enter your password."
        )

    if not verify_password(data.password, student["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password. Access denied. Please verify your password."
        )

    # Count currently active loans for this student
    active_borrows = db_manager.query("""
        SELECT COUNT(*) as active_cnt
        FROM LENDING_RECORD
        WHERE student_id = %s AND status IN ('Issued', 'Overdue')
    """, (student["student_id"],), fetch_one=True)
    active_cnt = active_borrows["active_cnt"] if active_borrows else 0

    access_token = create_access_token(subject=f"student_{student['student_id']}")
    return {
        "needs_password_setup": False,
        "access_token": access_token,
        "token_type": "bearer",
        "role": "student",
        "student_id": student["student_id"],
        "name": student["name"],
        "email": student["email"],
        "department": student["department"],
        "student_type": student["student_type"],
        "borrow_limit": student["borrow_limit"],
        "join_year": student["join_year"],
        "active_borrows_count": active_cnt
    }

@router.post("/student-setup-password", response_model=StudentLoginResponse)
def student_setup_password(data: StudentSetupPassword):
    identifier = data.identifier.strip()
    if not identifier:
        raise HTTPException(status_code=400, detail="Student ID or Institutional Email is required")
    if len(data.new_password) < 4:
        raise HTTPException(status_code=400, detail="Password must be at least 4 characters long")

    query = """
    SELECT s.student_id, p.name, p.email, s.department, s.join_year,
           CASE WHEN ug.student_id IS NOT NULL THEN 'Undergraduate' ELSE 'Postgraduate' END as student_type,
           COALESCE(ug.borrow_limit, pg.borrow_limit, 3) as borrow_limit
    FROM STUDENT s
    JOIN PERSON p ON s.student_id = p.person_id
    LEFT JOIN UNDERGRADUATE ug ON s.student_id = ug.student_id
    LEFT JOIN POSTGRADUATE pg ON s.student_id = pg.student_id
    WHERE CAST(s.student_id AS CHAR) = %s OR LOWER(p.email) = LOWER(%s)
    """
    student = db_manager.query(query, (identifier, identifier), fetch_one=True)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Hash and save password in MySQL
    pw_hash = get_password_hash(data.new_password)
    db_manager.execute("UPDATE STUDENT SET password = %s WHERE student_id = %s", (pw_hash, student["student_id"]))

    access_token = create_access_token(subject=f"student_{student['student_id']}")

    active_borrows = db_manager.query("""
        SELECT COUNT(*) as active_cnt
        FROM LENDING_RECORD
        WHERE student_id = %s AND status IN ('Issued', 'Overdue')
    """, (student["student_id"],), fetch_one=True)
    active_cnt = active_borrows["active_cnt"] if active_borrows else 0

    return {
        "needs_password_setup": False,
        "access_token": access_token,
        "token_type": "bearer",
        "role": "student",
        "student_id": student["student_id"],
        "name": student["name"],
        "email": student["email"],
        "department": student["department"],
        "student_type": student["student_type"],
        "borrow_limit": student["borrow_limit"],
        "join_year": student["join_year"],
        "active_borrows_count": active_cnt,
        "message": "Password successfully created in MySQL! You are now logged in."
    }

@router.post("/admin-setup-password")
def admin_setup_password(data: AdminSetupPassword):
    username = data.username.strip()
    if not username:
        raise HTTPException(status_code=400, detail="Administrator username is required")
    if len(data.new_password) < 4:
        raise HTTPException(status_code=400, detail="Password must be at least 4 characters long")

    admin = db_manager.query("SELECT * FROM ADMIN WHERE username = %s", (username,), fetch_one=True)
    if not admin:
        raise HTTPException(status_code=404, detail="Administrator username not found")

    pw_hash = get_password_hash(data.new_password)
    db_manager.execute("UPDATE ADMIN SET password = %s WHERE username = %s", (pw_hash, username))

    access_token = create_access_token(subject=admin["username"])
    return {
        "message": "Admin password successfully updated in MySQL!",
        "access_token": access_token,
        "token_type": "bearer",
        "admin_id": admin["admin_id"],
        "username": admin["username"],
    }

@router.get("/me", response_model=AdminResponse)
def get_me(current_admin: dict = Depends(get_current_admin)):
    # Fetch phone numbers
    phones = db_manager.query("SELECT phone_number FROM PERSON_PHONE WHERE person_id = %s", (current_admin["admin_id"],))
    phone_list = [p["phone_number"] for p in phones] if phones else []
    return {
        "admin_id": current_admin["admin_id"],
        "name": current_admin["name"],
        "email": current_admin["email"],
        "username": current_admin["username"],
        "phone_numbers": phone_list
    }

@router.get("/health")
def health_check():
    return {
        "status": "healthy",
        "database_engine": db_manager.engine_type,
        "mysql_connected": db_manager.engine_type == "mysql",
        "mysql_error": db_manager.mysql_error,
        "database_name": settings.DB_NAME,
        "host": settings.DB_HOST,
        "port": settings.DB_PORT
    }
