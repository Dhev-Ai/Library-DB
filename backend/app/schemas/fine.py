from typing import Optional, Literal
from pydantic import BaseModel, Field

class FineStatusUpdate(BaseModel):
    paid_status: Literal['Paid', 'Waived']

class FineCreateManual(BaseModel):
    lending_id: int
    amount: float = Field(..., gt=0)
    fine_type: Literal['overdue', 'damage']
    days_overdue: Optional[int] = None
    damage_note: Optional[str] = None

class FineResponse(BaseModel):
    fine_id: int
    lending_id: int
    student_id: int
    student_name: str
    book_id: int
    book_title: str
    amount: float
    paid_status: str
    fine_type: str
    days_overdue: Optional[int] = None
    damage_note: Optional[str] = None
    issue_date: str
    due_date: str
    return_date: Optional[str] = None
