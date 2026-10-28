from typing import Optional
from fastapi import APIRouter, HTTPException, Query, status
from app.db.connection import db_manager
from app.schemas.student import StudentCreate, StudentUpdate

router = APIRouter(prefix="/students", tags=["Students"])

@router.get("")
def get_students(
    search: Optional[str] = None,
    student_type: Optional[str] = None, # 'undergraduate' or 'postgraduate'
    department: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100)
):
    offset = (page - 1) * limit
    where_clauses = []
    params = []

    if search:
        s = f"%{search}%"
        where_clauses.append("(p.name LIKE %s OR p.email LIKE %s OR CAST(s.student_id AS CHAR) = %s)")
        params.extend([s, s, search])

    if student_type:
        if student_type.lower() == "undergraduate":
            where_clauses.append("ug.student_id IS NOT NULL")
        elif student_type.lower() == "postgraduate":
            where_clauses.append("pg.student_id IS NOT NULL")

    if department:
        where_clauses.append("s.department = %s")
        params.append(department)

    where_sql = ("WHERE " + " AND ".join(where_clauses)) if where_clauses else ""

    count_query = f"""
        SELECT COUNT(s.student_id) AS total
        FROM STUDENT s
        JOIN PERSON p ON s.student_id = p.person_id
        LEFT JOIN UNDERGRADUATE ug ON s.student_id = ug.student_id
        LEFT JOIN POSTGRADUATE pg ON s.student_id = pg.student_id
        {where_sql}
    """
    total_res = db_manager.query(count_query, tuple(params), fetch_one=True)
    total_count = total_res["total"] if total_res else 0

    query = f"""
        SELECT 
            s.student_id,
            p.name,
            p.email,
            s.department,
            s.join_year,
            CASE 
                WHEN ug.student_id IS NOT NULL THEN 'Undergraduate'
                WHEN pg.student_id IS NOT NULL THEN 'Postgraduate'
                ELSE 'Unknown'
            END AS student_type,
            COALESCE(ug.borrow_limit, pg.borrow_limit, 3) AS borrow_limit,
            pg.research_area,
            (SELECT COUNT(*) FROM LENDING_RECORD lr WHERE lr.student_id = s.student_id AND lr.status IN ('Issued', 'Overdue')) AS active_borrows_count,
            (SELECT COALESCE(SUM(f.amount), 0) FROM FINE f JOIN LENDING_RECORD lr ON f.lending_id = lr.lending_id WHERE lr.student_id = s.student_id AND f.paid_status = 'Unpaid') AS total_unpaid_fines
        FROM STUDENT s
        JOIN PERSON p ON s.student_id = p.person_id
        LEFT JOIN UNDERGRADUATE ug ON s.student_id = ug.student_id
        LEFT JOIN POSTGRADUATE pg ON s.student_id = pg.student_id
        {where_sql}
        ORDER BY s.student_id ASC
        LIMIT %s OFFSET %s
    """
    students = db_manager.query(query, tuple(params + [limit, offset]))

    # Attach phone numbers for each student
    for stu in students:
        phones = db_manager.query("SELECT phone_number FROM PERSON_PHONE WHERE person_id = %s", (stu["student_id"],))
        stu["phone_numbers"] = [ph["phone_number"] for ph in phones] if phones else []

    return {
        "items": students,
        "total": total_count,
        "page": page,
        "limit": limit,
        "total_pages": (total_count + limit - 1) // limit if limit > 0 else 1
    }

@router.get("/{student_id}")
def get_student_details(student_id: int):
    query = """
        SELECT 
            s.student_id,
            p.name,
            p.email,
            s.department,
            s.join_year,
            CASE 
                WHEN ug.student_id IS NOT NULL THEN 'Undergraduate'
                WHEN pg.student_id IS NOT NULL THEN 'Postgraduate'
                ELSE 'Unknown'
            END AS student_type,
            COALESCE(ug.borrow_limit, pg.borrow_limit, 3) AS borrow_limit,
            pg.research_area
        FROM STUDENT s
        JOIN PERSON p ON s.student_id = p.person_id
        LEFT JOIN UNDERGRADUATE ug ON s.student_id = ug.student_id
        LEFT JOIN POSTGRADUATE pg ON s.student_id = pg.student_id
        WHERE s.student_id = %s
    """
    student = db_manager.query(query, (student_id,), fetch_one=True)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Phone numbers
    phones = db_manager.query("SELECT phone_number FROM PERSON_PHONE WHERE person_id = %s", (student_id,))
    student["phone_numbers"] = [ph["phone_number"] for ph in phones] if phones else []

    # Lending records
    lending_records = db_manager.query("""
        SELECT 
            lr.lending_id,
            b.book_id,
            b.title AS book_title,
            lr.issue_date,
            lr.due_date,
            lr.return_date,
            lr.status,
            f.fine_id,
            f.amount AS fine_amount,
            f.paid_status
        FROM LENDING_RECORD lr
        JOIN BOOK b ON lr.book_id = b.book_id
        LEFT JOIN FINE f ON lr.lending_id = f.lending_id
        WHERE lr.student_id = %s
        ORDER BY lr.issue_date DESC
    """, (student_id,))

    # Reservations
    reservations = db_manager.query("""
        SELECT 
            b.book_id,
            b.title AS book_title,
            r.reserve_date,
            b.copies_available
        FROM RESERVES r
        JOIN BOOK b ON r.book_id = b.book_id
        WHERE r.student_id = %s
        ORDER BY r.reserve_date DESC
    """, (student_id,))

    student["lending_records"] = lending_records
    student["reservations"] = reservations
    student["active_borrows"] = [r for r in lending_records if r["status"] in ("Issued", "Overdue")]
    return student

@router.post("", status_code=status.HTTP_201_CREATED)
def create_student(data: StudentCreate):
    # Check email uniqueness
    existing = db_manager.query("SELECT person_id FROM PERSON WHERE email = %s", (data.email,), fetch_one=True)
    if existing:
        raise HTTPException(status_code=400, detail=f"Email '{data.email}' is already registered")

    # Transaction: PERSON -> PERSON_PHONE -> STUDENT -> UNDERGRADUATE / POSTGRADUATE
    person_id = db_manager.execute("INSERT INTO PERSON (name, email) VALUES (%s, %s)", (data.name, data.email))
    
    # Phone numbers
    for ph in data.phone_numbers:
        if ph.strip():
            db_manager.execute("INSERT INTO PERSON_PHONE (person_id, phone_number) VALUES (%s, %s)", (person_id, ph.strip()))

    # Student
    db_manager.execute("INSERT INTO STUDENT (student_id, department, join_year) VALUES (%s, %s, %s)", (person_id, data.department, data.join_year))

    # Subclass
    if data.student_type.lower() == "undergraduate":
        db_manager.execute("INSERT INTO UNDERGRADUATE (student_id, borrow_limit) VALUES (%s, 3)", (person_id,))
    else:
        research = data.research_area or "General Research"
        db_manager.execute("INSERT INTO POSTGRADUATE (student_id, borrow_limit, research_area) VALUES (%s, 6, %s)", (person_id, research))

    return {"message": "Student created successfully", "student_id": person_id}

@router.put("/{student_id}")
def update_student(student_id: int, data: StudentUpdate):
    existing = db_manager.query("SELECT * FROM PERSON WHERE person_id = %s", (student_id,), fetch_one=True)
    if not existing:
        raise HTTPException(status_code=404, detail="Student not found")

    if data.email and data.email != existing["email"]:
        dup = db_manager.query("SELECT person_id FROM PERSON WHERE email = %s AND person_id != %s", (data.email, student_id), fetch_one=True)
        if dup:
            raise HTTPException(status_code=400, detail="Email is already used by another person")

    # Update PERSON
    p_fields = []
    p_params = []
    if data.name:
        p_fields.append("name = %s")
        p_params.append(data.name)
    if data.email:
        p_fields.append("email = %s")
        p_params.append(data.email)
    if p_fields:
        p_params.append(student_id)
        db_manager.execute(f"UPDATE PERSON SET {', '.join(p_fields)} WHERE person_id = %s", tuple(p_params))

    # Update STUDENT
    s_fields = []
    s_params = []
    if data.department:
        s_fields.append("department = %s")
        s_params.append(data.department)
    if data.join_year:
        s_fields.append("join_year = %s")
        s_params.append(data.join_year)
    if s_fields:
        s_params.append(student_id)
        db_manager.execute(f"UPDATE STUDENT SET {', '.join(s_fields)} WHERE student_id = %s", tuple(s_params))

    # Update POSTGRADUATE research_area if applicable
    if data.research_area:
        db_manager.execute("UPDATE POSTGRADUATE SET research_area = %s WHERE student_id = %s", (data.research_area, student_id))

    # Update phone numbers if provided
    if data.phone_numbers is not None:
        db_manager.execute("DELETE FROM PERSON_PHONE WHERE person_id = %s", (student_id,))
        for ph in data.phone_numbers:
            if ph.strip():
                db_manager.execute("INSERT INTO PERSON_PHONE (person_id, phone_number) VALUES (%s, %s)", (student_id, ph.strip()))

    return {"message": "Student updated successfully", "student_id": student_id}

@router.delete("/{student_id}")
def delete_student(student_id: int):
    # Check FK RESTRICT on LENDING_RECORD
    lending = db_manager.query("SELECT COUNT(*) AS cnt FROM LENDING_RECORD WHERE student_id = %s", (student_id,), fetch_one=True)
    if lending and lending["cnt"] > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete student: {lending['cnt']} circulation record(s) exist for this student (FK Restrict constraint)."
        )

    # Deleting PERSON cascades to STUDENT, UNDERGRADUATE/POSTGRADUATE, PERSON_PHONE, RESERVES
    db_manager.execute("DELETE FROM PERSON WHERE person_id = %s", (student_id,))
    return {"message": "Student deleted successfully"}
