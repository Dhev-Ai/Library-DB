from typing import Optional, List, Literal
from pydantic import BaseModel, Field

class StudentCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: str = Field(..., min_length=5, max_length=120)
    department: str = Field(..., min_length=2, max_length=80)
    join_year: int = Field(..., ge=1990, le=2030)
    student_type: Literal['undergraduate', 'postgraduate']
    # Specific fields
    research_area: Optional[str] = None
    phone_numbers: List[str] = []

class StudentUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    department: Optional[str] = None
    join_year: Optional[int] = Field(None, ge=1990, le=2030)
    research_area: Optional[str] = None
    phone_numbers: Optional[List[str]] = None

class StudentResponse(BaseModel):
    student_id: int
    name: str
    email: str
    department: str
    join_year: int
    student_type: str
    borrow_limit: int
    research_area: Optional[str] = None
    phone_numbers: List[str] = []
    active_borrows_count: int = 0
    total_unpaid_fines: float = 0.0
