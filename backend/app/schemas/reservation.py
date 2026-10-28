from typing import Optional
from pydantic import BaseModel

class ReservationCreate(BaseModel):
    student_id: int
    book_id: int

class ReservationResponse(BaseModel):
    student_id: int
    student_name: str
    book_id: int
    book_title: str
    reserve_date: str
    copies_available: int
