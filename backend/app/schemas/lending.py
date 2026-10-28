from typing import Optional, Literal
from pydantic import BaseModel, Field

class LendingIssueRequest(BaseModel):
    student_id: int
    book_id: int
    due_date: str # YYYY-MM-DD
    issue_date: Optional[str] = None # Defaults to CURDATE()

class LendingReturnRequest(BaseModel):
    return_date: Optional[str] = None # Defaults to CURDATE()
    status: Literal['Returned', 'Damaged', 'Lost'] = 'Returned'
    damage_note: Optional[str] = None
    damage_fine_amount: Optional[float] = Field(None, ge=0)

class LendingResponse(BaseModel):
    lending_id: int
    student_id: int
    student_name: str
    book_id: int
    book_title: str
    admin_id: int
    admin_name: str
    issue_date: str
    due_date: str
    return_date: Optional[str] = None
    status: str
    days_overdue: int = 0
    calculated_overdue_fine: float = 0.0
    fine_id: Optional[int] = None
    fine_amount: Optional[float] = None
    fine_status: Optional[str] = None
    damage_note: Optional[str] = None
