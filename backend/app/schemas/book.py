from typing import Optional, Literal
from pydantic import BaseModel, Field

class BookBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    isbn: str = Field(..., min_length=5, max_length=20)
    author: str = Field(..., min_length=1, max_length=150)
    copies_available: int = Field(default=1, ge=0)
    category_id: int

class BookCreate(BookBase):
    subclass_type: Literal['standard', 'textbook', 'reference_book', 'journal'] = 'standard'
    # Textbook fields
    edition: Optional[str] = None
    # Reference book fields
    lendable: Optional[Literal['No', 'Yes']] = 'No'
    # Journal fields
    issue_no: Optional[int] = None
    volume_no: Optional[int] = None

class BookUpdate(BaseModel):
    title: Optional[str] = None
    isbn: Optional[str] = None
    author: Optional[str] = None
    copies_available: Optional[int] = Field(None, ge=0)
    category_id: Optional[int] = None
    edition: Optional[str] = None
    lendable: Optional[Literal['No', 'Yes']] = None
    issue_no: Optional[int] = None
    volume_no: Optional[int] = None

class BookResponse(BookBase):
    book_id: int
    category_name: Optional[str] = None
    subclass_type: str
    catalog_classification: str
    edition: Optional[str] = None
    lendable: Optional[str] = None
    issue_no: Optional[int] = None
    volume_no: Optional[int] = None
