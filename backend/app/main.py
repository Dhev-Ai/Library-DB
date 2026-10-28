from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from app.core.config import settings
from app.db.connection import db_manager
from app.routers import (
    auth,
    dashboard,
    books,
    categories,
    students,
    admins,
    lending,
    reservations,
    fines,
    reports,
    database,
    settings as settings_router,
    student_portal
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database connection on startup
    print(f"[Startup] Connecting to database for {settings.PROJECT_NAME}...")
    db_manager.init_database()
    yield
    print("[Shutdown] Cleaning up...")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="University Library Lending Management System REST API (Database Systems BACSE202)",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(books.router, prefix="/api")
app.include_router(categories.router, prefix="/api")
app.include_router(students.router, prefix="/api")
app.include_router(admins.router, prefix="/api")
app.include_router(lending.router, prefix="/api")
app.include_router(reservations.router, prefix="/api")
app.include_router(fines.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
app.include_router(database.router, prefix="/api")
app.include_router(settings_router.router, prefix="/api")
app.include_router(student_portal.router, prefix="/api")

@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse(url="/api/docs")

@app.get("/docs", include_in_schema=False)
def docs_alias():
    return RedirectResponse(url="/api/docs")

@app.get("/api", tags=["General"])
def api_root():
    return {
        "project": settings.PROJECT_NAME,
        "status": "online",
        "documentation": "/api/docs",
        "database_engine": db_manager.engine_type,
        "version": "1.0.0"
    }
