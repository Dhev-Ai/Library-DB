from pydantic import BaseModel, Field

class CategoryCreate(BaseModel):
    category_name: str = Field(..., min_length=2, max_length=100)

class CategoryResponse(BaseModel):
    category_id: int
    category_name: str
    book_count: int = 0
