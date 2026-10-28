import os
import re
import sqlite3
from typing import List, Dict, Any, Optional, Tuple
import pymysql
from pymysql.cursors import DictCursor
from app.core.config import settings

class DatabaseManager:
    def __init__(self):
        self.engine_type: str = "disconnected"
        self.mysql_error: Optional[str] = None
        self.sqlite_conn: Optional[sqlite3.Connection] = None
        self.sqlite_path: str = os.path.join(os.path.dirname(__file__), "..", "..", "library_lending.db")

    def test_mysql_connection(self) -> Tuple[bool, Optional[str]]:
        try:
            conn = pymysql.connect(
                host=settings.DB_HOST,
                port=settings.DB_PORT,
                user=settings.DB_USER,
                password=settings.DB_PASSWORD,
                database=settings.DB_NAME,
                charset='utf8mb4',
                cursorclass=DictCursor,
                connect_timeout=3
            )
            conn.close()
            return True, None
        except Exception as e:
            return False, str(e)

    def get_mysql_connection(self):
        return pymysql.connect(
            host=settings.DB_HOST,
            port=settings.DB_PORT,
            user=settings.DB_USER,
            password=settings.DB_PASSWORD,
            database=settings.DB_NAME,
            charset='utf8mb4',
            cursorclass=DictCursor,
            autocommit=False
        )

    def get_sqlite_connection(self) -> sqlite3.Connection:
        if self.sqlite_conn is None:
            # Create or open SQLite fallback DB
            self.sqlite_conn = sqlite3.connect(self.sqlite_path, check_same_thread=False)
            self.sqlite_conn.row_factory = sqlite3.Row
            self.sqlite_conn.execute("PRAGMA foreign_keys = ON;")
        return self.sqlite_conn

    def init_database(self):
        """Initializes connection: prefers MySQL; falls back to SQLite with full schema and sample data."""
        success, err = self.test_mysql_connection()
        if success:
            self.engine_type = "mysql"
            self.mysql_error = None
            print(f"[DB] Successfully connected to live MySQL 8.0 database '{settings.DB_NAME}'")
            self._ensure_mysql_bootstrap()
        else:
            self.engine_type = "sqlite_fallback"
            self.mysql_error = err
            print(f"[DB WARNING] Could not connect to MySQL: {err}")
            print(f"[DB] Initializing SQLite local fallback database at {self.sqlite_path}")
            self._init_sqlite_schema()

    def _ensure_mysql_bootstrap(self):
        """Ensure default admin has a known password if sample hash cannot be decrypted."""
        try:
            conn = self.get_mysql_connection()
            with conn.cursor() as cur:
                cur.execute("SELECT COUNT(*) AS cnt FROM ADMIN WHERE username = 'admin'")
                row = cur.fetchone()
                if row and row['cnt'] == 0:
                    # Check if person_id 9 exists
                    cur.execute("SELECT person_id FROM PERSON WHERE person_id = 9")
                    if not cur.fetchone():
                        cur.execute("INSERT INTO PERSON (person_id, name, email) VALUES (9, 'Dr. Rajesh Sundaram', 'rajesh.sundaram@vitlibrary.ac.in')")
                    from app.core.security import get_password_hash
                    pw_hash = get_password_hash("Admin@123")
                    cur.execute("INSERT INTO ADMIN (admin_id, username, password) VALUES (9, 'admin', %s) ON DUPLICATE KEY UPDATE password = %s", (pw_hash, pw_hash))
                    conn.commit()
            conn.close()
        except Exception as e:
            print(f"[DB Boot] Warning during admin bootstrap: {e}")

    def _init_sqlite_schema(self):
        conn = self.get_sqlite_connection()
        cur = conn.cursor()
        
        # Check if already initialized
        cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='PERSON';")
        if cur.fetchone():
            return  # Already initialized

        # Build schema compatible with SQLite
        schema_sql = """
        CREATE TABLE IF NOT EXISTS PERSON (
            person_id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE
        );

        CREATE TABLE IF NOT EXISTS PERSON_PHONE (
            person_id INTEGER NOT NULL,
            phone_number TEXT NOT NULL,
            PRIMARY KEY (person_id, phone_number),
            FOREIGN KEY (person_id) REFERENCES PERSON(person_id) ON DELETE CASCADE ON UPDATE CASCADE
        );

        CREATE TABLE IF NOT EXISTS STUDENT (
            student_id INTEGER PRIMARY KEY,
            department TEXT NOT NULL,
            join_year INTEGER NOT NULL,
            FOREIGN KEY (student_id) REFERENCES PERSON(person_id) ON DELETE CASCADE ON UPDATE CASCADE
        );

        CREATE TABLE IF NOT EXISTS UNDERGRADUATE (
            student_id INTEGER PRIMARY KEY,
            borrow_limit INTEGER NOT NULL DEFAULT 3,
            FOREIGN KEY (student_id) REFERENCES STUDENT(student_id) ON DELETE CASCADE ON UPDATE CASCADE
        );

        CREATE TABLE IF NOT EXISTS POSTGRADUATE (
            student_id INTEGER PRIMARY KEY,
            borrow_limit INTEGER NOT NULL DEFAULT 6,
            research_area TEXT NOT NULL,
            FOREIGN KEY (student_id) REFERENCES STUDENT(student_id) ON DELETE CASCADE ON UPDATE CASCADE
        );

        CREATE TABLE IF NOT EXISTS ADMIN (
            admin_id INTEGER PRIMARY KEY,
            username TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            FOREIGN KEY (admin_id) REFERENCES PERSON(person_id) ON DELETE CASCADE ON UPDATE CASCADE
        );

        CREATE TABLE IF NOT EXISTS REPORT (
            report_id INTEGER PRIMARY KEY AUTOINCREMENT,
            report_type TEXT NOT NULL,
            generated_date TEXT NOT NULL DEFAULT (datetime('now','localtime')),
            admin_id INTEGER NOT NULL,
            FOREIGN KEY (admin_id) REFERENCES ADMIN(admin_id) ON DELETE RESTRICT ON UPDATE CASCADE
        );

        CREATE TABLE IF NOT EXISTS CATEGORY (
            category_id INTEGER PRIMARY KEY AUTOINCREMENT,
            category_name TEXT NOT NULL UNIQUE
        );

        CREATE TABLE IF NOT EXISTS BOOK (
            book_id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            isbn TEXT NOT NULL UNIQUE,
            author TEXT NOT NULL,
            copies_available INTEGER NOT NULL DEFAULT 1,
            category_id INTEGER NOT NULL,
            FOREIGN KEY (category_id) REFERENCES CATEGORY(category_id) ON DELETE RESTRICT ON UPDATE CASCADE
        );

        CREATE TABLE IF NOT EXISTS TEXTBOOK (
            book_id INTEGER PRIMARY KEY,
            edition TEXT NOT NULL,
            FOREIGN KEY (book_id) REFERENCES BOOK(book_id) ON DELETE CASCADE ON UPDATE CASCADE
        );

        CREATE TABLE IF NOT EXISTS REFERENCE_BOOK (
            book_id INTEGER PRIMARY KEY,
            lendable TEXT NOT NULL DEFAULT 'No',
            FOREIGN KEY (book_id) REFERENCES BOOK(book_id) ON DELETE CASCADE ON UPDATE CASCADE
        );

        CREATE TABLE IF NOT EXISTS JOURNAL (
            book_id INTEGER PRIMARY KEY,
            issue_no INTEGER NOT NULL,
            volume_no INTEGER NOT NULL,
            FOREIGN KEY (book_id) REFERENCES BOOK(book_id) ON DELETE CASCADE ON UPDATE CASCADE
        );

        CREATE TABLE IF NOT EXISTS RESERVES (
            student_id INTEGER NOT NULL,
            book_id INTEGER NOT NULL,
            reserve_date TEXT NOT NULL DEFAULT (datetime('now','localtime')),
            PRIMARY KEY (student_id, book_id),
            FOREIGN KEY (student_id) REFERENCES STUDENT(student_id) ON DELETE CASCADE ON UPDATE CASCADE,
            FOREIGN KEY (book_id) REFERENCES BOOK(book_id) ON DELETE CASCADE ON UPDATE CASCADE
        );

        CREATE TABLE IF NOT EXISTS LENDING_RECORD (
            lending_id INTEGER PRIMARY KEY AUTOINCREMENT,
            issue_date TEXT NOT NULL,
            due_date TEXT NOT NULL,
            return_date TEXT,
            status TEXT NOT NULL DEFAULT 'Issued',
            student_id INTEGER NOT NULL,
            book_id INTEGER NOT NULL,
            admin_id INTEGER NOT NULL,
            FOREIGN KEY (student_id) REFERENCES STUDENT(student_id) ON DELETE RESTRICT ON UPDATE CASCADE,
            FOREIGN KEY (book_id) REFERENCES BOOK(book_id) ON DELETE RESTRICT ON UPDATE CASCADE,
            FOREIGN KEY (admin_id) REFERENCES ADMIN(admin_id) ON DELETE RESTRICT ON UPDATE CASCADE
        );

        CREATE TABLE IF NOT EXISTS FINE (
            fine_id INTEGER PRIMARY KEY AUTOINCREMENT,
            amount REAL NOT NULL,
            paid_status TEXT NOT NULL DEFAULT 'Unpaid',
            lending_id INTEGER NOT NULL UNIQUE,
            FOREIGN KEY (lending_id) REFERENCES LENDING_RECORD(lending_id) ON DELETE RESTRICT ON UPDATE CASCADE
        );

        CREATE TABLE IF NOT EXISTS DAMAGE_FINE (
            fine_id INTEGER PRIMARY KEY,
            damage_note TEXT NOT NULL,
            FOREIGN KEY (fine_id) REFERENCES FINE(fine_id) ON DELETE CASCADE ON UPDATE CASCADE
        );

        CREATE TABLE IF NOT EXISTS OVERDUE_FINE (
            fine_id INTEGER PRIMARY KEY,
            days_overdue INTEGER NOT NULL,
            FOREIGN KEY (fine_id) REFERENCES FINE(fine_id) ON DELETE CASCADE ON UPDATE CASCADE
        );
        """
        cur.executescript(schema_sql)

        # Seed initial sample data from DML
        seed_sql = """
        INSERT INTO PERSON (person_id, name, email) VALUES
        (1, 'Aarav Sharma', 'aarav.sharma@vitstudent.ac.in'),
        (2, 'Diya Patel', 'diya.patel@vitstudent.ac.in'),
        (3, 'Rohan Iyer', 'rohan.iyer@vitstudent.ac.in'),
        (4, 'Ananya Sen', 'ananya.sen@vitstudent.ac.in'),
        (5, 'Kavya Nair', 'kavya.nair@vitstudent.ac.in'),
        (6, 'Vikram Malhotra', 'vikram.malhotra@vitstudent.ac.in'),
        (7, 'Meera Deshmukh', 'meera.deshmukh@vitstudent.ac.in'),
        (8, 'Tanmay Joshi', 'tanmay.joshi@vitstudent.ac.in'),
        (9, 'Dr. Rajesh Sundaram', 'rajesh.sundaram@vitlibrary.ac.in'),
        (10, 'Sangeetha Rao', 'sangeetha.rao@vitlibrary.ac.in'),
        (11, 'Manoj Kulkarni', 'manoj.kulkarni@vitlibrary.ac.in'),
        (12, 'Pranav Verma', 'pranav.verma@vitstudent.ac.in');

        INSERT INTO PERSON_PHONE (person_id, phone_number) VALUES
        (1, '+91-9840112345'),
        (1, '+91-9840198765'),
        (2, '+91-9876543210'),
        (3, '+91-9789012345'),
        (4, '+91-9444123456'),
        (5, '+91-9381234567'),
        (6, '+91-9820123456'),
        (6, '+91-9820987654'),
        (7, '+91-9967123456'),
        (8, '+91-9123456789'),
        (9, '+91-9841001122'),
        (10, '+91-9841002233'),
        (11, '+91-9841003344'),
        (12, '+91-9840998877');

        INSERT INTO STUDENT (student_id, department, join_year) VALUES
        (1, 'Computer Science & Engineering', 2023),
        (2, 'Artificial Intelligence & Data Science', 2023),
        (3, 'Electronics & Communication', 2024),
        (4, 'Mechanical Engineering', 2024),
        (5, 'Information Technology', 2023),
        (6, 'Computer Science & Engineering', 2022),
        (7, 'Electrical & Electronics', 2021),
        (8, 'Data Science & Analytics', 2022),
        (12, 'Mechanical Engineering', 2024);

        INSERT INTO UNDERGRADUATE (student_id, borrow_limit) VALUES
        (1, 3), (2, 3), (3, 3), (4, 3), (5, 3), (12, 3);

        INSERT INTO POSTGRADUATE (student_id, borrow_limit, research_area) VALUES
        (6, 6, 'Distributed Systems & Cloud Computing'),
        (7, 6, 'Smart Grid Energy Optimization'),
        (8, 6, 'Natural Language Processing and LLMs');

        INSERT INTO ADMIN (admin_id, username, password) VALUES
        (9, 'admin_rajesh', '$2b$12$e8wZ3o.QZ39.Y7eN59aZyei420yV4GvKj/9Lp5vE36/x9y.f'),
        (10, 'admin_sangeetha', '$2b$12$w8gZ3o.QZ39.Y7eN59aZyei420yV4GvKj/9Lp5vE36/x9y.b'),
        (11, 'admin_manoj', '$2b$12$k3hZ3o.QZ39.Y7eN59aZyei420yV4GvKj/9Lp5vE36/x9y.m');

        INSERT INTO CATEGORY (category_id, category_name) VALUES
        (1, 'Computer Science & Software Engineering'),
        (2, 'Artificial Intelligence & Machine Learning'),
        (3, 'Electronics & Hardware Systems'),
        (4, 'Mathematics & Statistics'),
        (5, 'Mechanical & Robotics Engineering');

        INSERT INTO BOOK (book_id, title, isbn, author, copies_available, category_id) VALUES
        (101, 'Database System Concepts', '978-0078022159', 'Abraham Silberschatz, Henry F. Korth', 8, 1),
        (102, 'Operating System Concepts', '978-1118063330', 'Abraham Silberschatz, Peter Baer Galvin', 5, 1),
        (103, 'Artificial Intelligence: A Modern Approach', '978-0134610993', 'Stuart Russell, Peter Norvig', 4, 2),
        (104, 'Introduction to Algorithms (CLRS)', '978-0262046305', 'Thomas H. Cormen, Charles E. Leiserson', 2, 1),
        (105, 'The Art of Computer Programming, Vol 1', '978-0201896831', 'Donald E. Knuth', 2, 1),
        (106, 'Oxford Dictionary of Computing', '978-0199688975', 'John Daintith, Edmund Wright', 3, 1),
        (107, 'IEEE Transactions on Pattern Analysis and Machine Intelligence', '0162-8828-2026', 'IEEE Computer Society', 2, 2),
        (108, 'ACM Transactions on Database Systems (TODS)', '0362-5915-2026', 'Association for Computing Machinery', 2, 1),
        (109, 'Pattern Recognition and Machine Learning', '978-0387310732', 'Christopher M. Bishop', 4, 2),
        (110, 'Digital Design and Computer Architecture', '978-0123944245', 'David Harris, Sarah Harris', 6, 3);

        INSERT INTO TEXTBOOK (book_id, edition) VALUES
        (101, '7th International Edition'),
        (102, '10th Edition'),
        (103, '4th Global Edition'),
        (104, '4th Edition'),
        (109, '1st Edition (Reprint 2024)'),
        (110, '2nd Edition');

        INSERT INTO REFERENCE_BOOK (book_id, lendable) VALUES
        (105, 'No'),
        (106, 'No');

        INSERT INTO JOURNAL (book_id, issue_no, volume_no) VALUES
        (107, 6, 48),
        (108, 2, 51);

        INSERT INTO RESERVES (student_id, book_id, reserve_date) VALUES
        (1, 104, '2026-10-10 11:20:00'),
        (2, 103, '2026-10-11 15:45:00'),
        (6, 101, '2026-10-12 09:10:00'),
        (7, 107, '2026-10-13 16:30:00');

        INSERT INTO LENDING_RECORD (lending_id, issue_date, due_date, return_date, status, student_id, book_id, admin_id) VALUES
        (201, '2026-09-01', '2026-09-15', '2026-09-14', 'Returned', 1, 101, 9),
        (202, '2026-09-05', '2026-09-19', '2026-09-27', 'Returned', 2, 102, 10),
        (203, '2026-09-10', '2026-09-24', '2026-09-23', 'Damaged', 3, 104, 9),
        (204, '2026-09-15', '2026-09-29', NULL, 'Overdue', 4, 103, 11),
        (205, '2026-10-05', '2026-10-19', NULL, 'Issued', 6, 109, 9),
        (206, '2026-10-08', '2026-10-22', NULL, 'Issued', 8, 101, 10);

        INSERT INTO FINE (fine_id, amount, paid_status, lending_id) VALUES
        (301, 12.00, 'Paid', 202),
        (302, 35.00, 'Unpaid', 203),
        (303, 22.50, 'Unpaid', 204);

        INSERT INTO DAMAGE_FINE (fine_id, damage_note) VALUES
        (302, 'Severe water damage to chapters 3 and 4, binding partially detached.');

        INSERT INTO OVERDUE_FINE (fine_id, days_overdue) VALUES
        (301, 8),
        (303, 15);

        INSERT INTO REPORT (report_id, report_type, generated_date, admin_id) VALUES
        (1, 'Monthly Circulation Summary - Sep 2026', '2026-09-30 18:30:00', 9),
        (2, 'Overdue & Defaulters Audit Report', '2026-10-05 10:15:00', 10),
        (3, 'Damage & Lost Inventory Report Q3', '2026-10-10 14:00:00', 11),
        (4, 'High Demand Books & Reservation Backlog', '2026-10-14 09:00:00', 9);
        """
        cur.executescript(seed_sql)
        conn.commit()

    def query(self, sql: str, params: Any = None, fetch_one: bool = False, fetch_all: bool = True) -> Any:
        """Executes a SELECT query and returns dict or list of dicts."""
        if self.engine_type == "mysql":
            conn = self.get_mysql_connection()
            try:
                with conn.cursor() as cur:
                    cur.execute(sql, params or ())
                    if fetch_one:
                        return cur.fetchone()
                    if fetch_all:
                        return cur.fetchall()
                    return None
            finally:
                conn.close()
        else:
            conn = self.get_sqlite_connection()
            # Convert %s placeholders to ? for sqlite
            sqlite_sql = re.sub(r'%s', '?', sql)
            # Replace MySQL specific functions like CURDATE() -> date('now')
            sqlite_sql = re.sub(r'\bCURDATE\(\)', "date('now')", sqlite_sql, flags=re.IGNORECASE)
            sqlite_sql = re.sub(r'\bNOW\(\)', "datetime('now','localtime')", sqlite_sql, flags=re.IGNORECASE)
            sqlite_sql = re.sub(r'\bCURRENT_TIMESTAMP\b', "datetime('now','localtime')", sqlite_sql, flags=re.IGNORECASE)
            cur = conn.cursor()
            cur.execute(sqlite_sql, params or ())
            if fetch_one:
                row = cur.fetchone()
                return dict(row) if row else None
            if fetch_all:
                rows = cur.fetchall()
                return [dict(r) for r in rows]
            return None

    def execute(self, sql: str, params: Any = None) -> int:
        """Executes an INSERT, UPDATE, or DELETE query and returns lastrowid or affected rows."""
        if self.engine_type == "mysql":
            conn = self.get_mysql_connection()
            try:
                with conn.cursor() as cur:
                    cur.execute(sql, params or ())
                    last_id = cur.lastrowid
                    conn.commit()
                    return last_id or cur.rowcount
            except Exception:
                conn.rollback()
                raise
            finally:
                conn.close()
        else:
            conn = self.get_sqlite_connection()
            sqlite_sql = re.sub(r'%s', '?', sql)
            sqlite_sql = re.sub(r'\bCURDATE\(\)', "date('now')", sqlite_sql, flags=re.IGNORECASE)
            sqlite_sql = re.sub(r'\bNOW\(\)', "datetime('now','localtime')", sqlite_sql, flags=re.IGNORECASE)
            try:
                cur = conn.cursor()
                cur.execute(sqlite_sql, params or ())
                last_id = cur.lastrowid
                conn.commit()
                return last_id or cur.rowcount
            except Exception:
                conn.rollback()
                raise

    def execute_transaction(self, statements: List[Tuple[str, Any]]):
        """Executes a list of (sql, params) statements inside a single transaction."""
        if self.engine_type == "mysql":
            conn = self.get_mysql_connection()
            try:
                with conn.cursor() as cur:
                    for sql, params in statements:
                        cur.execute(sql, params or ())
                    conn.commit()
            except Exception:
                conn.rollback()
                raise
            finally:
                conn.close()
        else:
            conn = self.get_sqlite_connection()
            try:
                cur = conn.cursor()
                for sql, params in statements:
                    sqlite_sql = re.sub(r'%s', '?', sql)
                    sqlite_sql = re.sub(r'\bCURDATE\(\)', "date('now')", sqlite_sql, flags=re.IGNORECASE)
                    sqlite_sql = re.sub(r'\bNOW\(\)', "datetime('now','localtime')", sqlite_sql, flags=re.IGNORECASE)
                    cur.execute(sqlite_sql, params or ())
                conn.commit()
            except Exception:
                conn.rollback()
                raise

db_manager = DatabaseManager()
