# Library Lending Management System

**Course:** Database Systems (`BACSE202`)  
**Project:** Library Lending Management System (Phase 1 & Phase 2 Full-Stack Implementation)  
**Standard:** MySQL 8.0+ / Standard SQL normalized up to 3NF

---

## 1. System Overview & Architecture

The **Library Lending Management System** is a university-grade library administration and circulation management platform. It features an interactive React frontend with Tailwind CSS and Recharts, backed by a high-performance Python FastAPI REST API connected to the MySQL `library_lending_db` database.

### Core Architecture
- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS v4 + Lucide React + Recharts
- **Backend:** Python 3.12+ + FastAPI + Pydantic v2 + PyMySQL + Bcrypt + PyJWT
- **Database:** MySQL 8.0+ (`library_lending_db`) with built-in SQLite fallback persistence for environments where MySQL is offline
- **Security:** Bcrypt salted password hashing, JWT Bearer authentication, Parameterized SQL queries preventing SQL injection

---

## 2. EER Relational Schema (17 Tables)

The database schema preserves all normalization rules (1NF, 2NF, 3NF) and specialization hierarchies:

| Table | Entity Classification | Keys & Constraints |
|---|---|---|
| `PERSON` | Superclass Entity | `PK(person_id)`, `UNIQUE(email)`, Email check format |
| `PERSON_PHONE` | Multi-valued Decomposition | `PK(person_id, phone_number)`, `FK -> PERSON (CASCADE)` |
| `STUDENT` | Subclass of `PERSON` | `PK(student_id)`, `FK -> PERSON (CASCADE)`, `join_year >= 1990` |
| `UNDERGRADUATE` | Subclass of `STUDENT` | `PK(student_id)`, `FK -> STUDENT`, `borrow_limit = 3` |
| `POSTGRADUATE` | Subclass of `STUDENT` | `PK(student_id)`, `FK -> STUDENT`, `borrow_limit = 6`, `research_area` |
| `ADMIN` | Subclass of `PERSON` | `PK(admin_id)`, `FK -> PERSON`, `UNIQUE(username)`, Bcrypt hashed `password` |
| `REPORT` | System Audit Metadata | `PK(report_id)`, `FK -> ADMIN (RESTRICT)` |
| `CATEGORY` | 3NF Decomposition | `PK(category_id)`, `UNIQUE(category_name)` |
| `BOOK` | Catalog Entity | `PK(book_id)`, `UNIQUE(isbn)`, `FK -> CATEGORY (RESTRICT)`, `copies_available >= 0` |
| `TEXTBOOK` | Subclass of `BOOK` | `PK(book_id)`, `FK -> BOOK (CASCADE)`, `edition` |
| `REFERENCE_BOOK` | Subclass of `BOOK` | `PK(book_id)`, `FK -> BOOK (CASCADE)`, `lendable = 'No'` |
| `JOURNAL` | Subclass of `BOOK` | `PK(book_id)`, `FK -> BOOK (CASCADE)`, `volume_no`, `issue_no` |
| `RESERVES` | M:N Relationship | `PK(student_id, book_id)`, `FK -> STUDENT`, `FK -> BOOK`, `reserve_date` |
| `LENDING_RECORD`| Circulation Hub | `PK(lending_id)`, `FK -> STUDENT (RESTRICT)`, `FK -> BOOK (RESTRICT)`, `FK -> ADMIN (RESTRICT)` |
| `FINE` | 1:1 with `LENDING_RECORD` | `PK(fine_id)`, `UNIQUE(lending_id)`, `amount >= 0`, `paid_status` |
| `DAMAGE_FINE` | Subclass of `FINE` | `PK(fine_id)`, `FK -> FINE (CASCADE)`, `damage_note` |
| `OVERDUE_FINE` | Subclass of `FINE` | `PK(fine_id)`, `FK -> FINE (CASCADE)`, `days_overdue > 0` |

---

## 3. Quick Start & Execution Instructions

### Prerequisites
- Node.js 18+ & NPM
- Python 3.10+
- MySQL Server 8.0+ running on port 3306

### Step 1: Configure Environment Variables
Copy `.env.example` to `backend/.env` and update your MySQL password:
```ini
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=library_lending_db

SECRET_KEY=university_library_lending_system_jwt_secret_key_2026
DAILY_OVERDUE_RATE=1.50
CURRENCY_SYMBOL=$
```

### Step 2: Initialize Database (If not already created)
In MySQL CLI or MySQL Workbench, execute:
```sql
SOURCE library_lending_ddl.sql;
SOURCE library_lending_dml.sql;
```

### Step 3: Run FastAPI Backend
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
API Documentation (Swagger UI): `http://127.0.0.1:8000/docs`

### Step 4: Run React Frontend
```bash
cd frontend
npm install
npm run dev
```
Open in browser: `http://localhost:5173`

---

## 4. Evaluation Credentials

The application provides instant one-click login buttons on the login screen for testing:

| Role | Username | Password | Access Level |
|---|---|---|---|
| Chief Librarian | `admin_rajesh` | `Admin@123` | Full Administrative Privileges |
| Assistant Librarian | `admin_sangeetha` | `Admin@123` | Full Administrative Privileges |
| System Admin | `admin_manoj` | `Admin@123` | Full Administrative Privileges |

---

## 5. Automated Tests

Run the automated test suite verifying all 8 critical business constraints:
```bash
python -m unittest tests/test_library_system.py
```
- Tests database initialization and entity existence
- Tests bcrypt password hashing and JWT authentication
- Tests Undergraduate (3) and Postgraduate (6) borrowing limits
- Tests non-lendable Reference Book constraint
- Tests book issue & stock decrement transaction
- Tests return, stock restoration, and overdue calculation
- Tests configurable fine policy rates
- Tests Database Explorer introspection across all 17 tables
