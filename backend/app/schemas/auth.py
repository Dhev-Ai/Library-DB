from typing import Optional, List
from pydantic import BaseModel, Field

class Token(BaseModel):
    access_token: str
    token_type: str
    admin_id: int
    username: str
    name: str

class TokenData(BaseModel):
    admin_id: Optional[int] = None
    username: Optional[str] = None
    student_id: Optional[int] = None
    role: Optional[str] = "admin"

class AdminLogin(BaseModel):
    username: str
    password: str

class StudentLogin(BaseModel):
    identifier: str # Student ID (e.g. "1") or Email (e.g. "aarav.sharma@vitstudent.ac.in")
    password: Optional[str] = None

class StudentSetupPassword(BaseModel):
    identifier: str
    new_password: str = Field(..., min_length=4)

class AdminSetupPassword(BaseModel):
    username: str
    new_password: str = Field(..., min_length=4)

class StudentLoginResponse(BaseModel):
    needs_password_setup: bool = False
    message: Optional[str] = None
    access_token: Optional[str] = None
    token_type: Optional[str] = "bearer"
    role: Optional[str] = "student"
    student_id: Optional[int] = None
    name: Optional[str] = None
    email: Optional[str] = None
    department: Optional[str] = None
    student_type: Optional[str] = None
    borrow_limit: Optional[int] = None
    join_year: Optional[int] = None
    active_borrows_count: Optional[int] = 0

class StudentToken(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str = "student"
    student_id: int
    name: str
    email: str
    department: str
    student_type: str
    borrow_limit: int
    join_year: int
    active_borrows_count: int = 0

class AdminCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: str = Field(..., min_length=5, max_length=120)
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=4)
    phone_numbers: Optional[List[str]] = []

class AdminResponse(BaseModel):
    admin_id: int
    name: str
    email: str
    username: str
    phone_numbers: Optional[List[str]] = []
