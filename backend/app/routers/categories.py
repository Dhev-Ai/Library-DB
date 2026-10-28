from fastapi import APIRouter, HTTPException, status
from app.db.connection import db_manager
from app.schemas.category import CategoryCreate

router = APIRouter(prefix="/categories", tags=["Categories"])

@router.get("")
def get_categories():
    query = """
        SELECT 
            c.category_id,
            c.category_name,
            COUNT(b.book_id) AS book_count
        FROM CATEGORY c
        LEFT JOIN BOOK b ON c.category_id = b.category_id
        GROUP BY c.category_id, c.category_name
        ORDER BY c.category_name ASC
    """
    return db_manager.query(query)

@router.post("", status_code=status.HTTP_201_CREATED)
def create_category(cat: CategoryCreate):
    existing = db_manager.query("SELECT category_id FROM CATEGORY WHERE category_name = %s", (cat.category_name,), fetch_one=True)
    if existing:
        raise HTTPException(status_code=400, detail="Category name already exists")
    
    cat_id = db_manager.execute("INSERT INTO CATEGORY (category_name) VALUES (%s)", (cat.category_name,))
    return {"category_id": cat_id, "category_name": cat.category_name}

@router.put("/{category_id}")
def update_category(category_id: int, cat: CategoryCreate):
    existing = db_manager.query("SELECT category_id FROM CATEGORY WHERE category_id = %s", (category_id,), fetch_one=True)
    if not existing:
        raise HTTPException(status_code=404, detail="Category not found")
    
    dup = db_manager.query("SELECT category_id FROM CATEGORY WHERE category_name = %s AND category_id != %s", (cat.category_name, category_id), fetch_one=True)
    if dup:
        raise HTTPException(status_code=400, detail="Category name already in use")

    db_manager.execute("UPDATE CATEGORY SET category_name = %s WHERE category_id = %s", (cat.category_name, category_id))
    return {"category_id": category_id, "category_name": cat.category_name}

@router.delete("/{category_id}")
def delete_category(category_id: int):
    # Check FK RESTRICT constraint from BOOK
    books = db_manager.query("SELECT COUNT(*) AS cnt FROM BOOK WHERE category_id = %s", (category_id,), fetch_one=True)
    if books and books["cnt"] > 0:
        raise HTTPException(status_code=400, detail=f"Cannot delete category: {books['cnt']} book(s) belong to this category (FK Restrict).")

    db_manager.execute("DELETE FROM CATEGORY WHERE category_id = %s", (category_id,))
    return {"message": "Category deleted successfully"}
