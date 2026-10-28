from typing import Optional, Dict, Any, List
from pydantic import BaseModel

class ReportSaveRequest(BaseModel):
    report_type: str

class ReportResponse(BaseModel):
    report_id: int
    report_type: str
    generated_date: str
    admin_id: int
    admin_name: str
