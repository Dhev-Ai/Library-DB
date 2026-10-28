from fastapi import APIRouter, HTTPException, Depends, status
from app.core.dependencies import get_current_admin
from app.core.security import get_password_hash
from app.db.connection import db_manager
from app.schemas.auth import AdminCreate, AdminResponse

router = APIRouter(prefix="/admins", tags=["Library Staff"])

@router.get("")
def get_admins(current_admin: dict = Depends(get_current_admin)):
    query = """
        SELECT 
            a.admin_id,
            a.username,
            p.name,
            p.email
        FROM ADMIN a
        JOIN PERSON p ON a.admin_id = p.person_id
        ORDER BY a.admin_id ASC
    """
    admins = db_manager.query(query)
    for adm in admins:
        phones = db_manager.query("SELECT phone_number FROM PERSON_PHONE WHERE person_id = %s", (adm["admin_id"],))
        adm["phone_numbers"] = [ph["phone_number"] for ph in phones] if phones else []
    return admins

@router.post("", status_code=status.HTTP_201_CREATED)
def create_admin(data: AdminCreate, current_admin: dict = Depends(get_current_admin)):
    # Check username uniqueness
    existing_u = db_manager.query("SELECT admin_id FROM ADMIN WHERE username = %s", (data.username,), fetch_one=True)
    if existing_u:
        raise HTTPException(status_code=400, detail="Username is already taken")

    # Check email uniqueness
    existing_e = db_manager.query("SELECT person_id FROM PERSON WHERE email = %s", (data.email,), fetch_one=True)
    if existing_e:
        raise HTTPException(status_code=400, detail="Email is already in use")

    hashed_pw = get_password_hash(data.password)

    # Insert into PERSON then ADMIN
    person_id = db_manager.execute("INSERT INTO PERSON (name, email) VALUES (%s, %s)", (data.name, data.email))
    db_manager.execute("INSERT INTO ADMIN (admin_id, username, password) VALUES (%s, %s, %s)", (person_id, data.username, hashed_pw))

    # Phones
    for ph in data.phone_numbers:
        if ph.strip():
            db_manager.execute("INSERT INTO PERSON_PHONE (person_id, phone_number) VALUES (%s, %s)", (person_id, ph.strip()))

    return {"message": "Administrator created successfully", "admin_id": person_id, "username": data.username}
