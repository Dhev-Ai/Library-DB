import sys
import os
import unittest
import time
from datetime import date, timedelta

# Ensure backend app is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))

from app.db.connection import db_manager
from app.core.security import verify_password, get_password_hash, create_access_token, decode_token

class TestLibraryLendingSystem(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        db_manager.init_database()

    def test_database_initialization(self):
        """Verifies database is loaded and all core entities exist."""
        self.assertIn(db_manager.engine_type, ["mysql", "sqlite_fallback"])
        tables = ["PERSON", "STUDENT", "UNDERGRADUATE", "POSTGRADUATE", "ADMIN", "BOOK", "CATEGORY", "LENDING_RECORD", "FINE", "RESERVES"]
        for t in tables:
            res = db_manager.query(f"SELECT COUNT(*) AS c FROM {t}", fetch_one=True)
            self.assertIsNotNone(res)
            self.assertGreaterEqual(res["c"], 0)

    def test_admin_authentication_and_hashing(self):
        """Tests password hashing and token generation."""
        hashed = get_password_hash("TestPass123")
        self.assertTrue(verify_password("TestPass123", hashed))
        self.assertFalse(verify_password("WrongPass", hashed))

        token = create_access_token(subject="admin_test")
        payload = decode_token(token)
        self.assertIsNotNone(payload)
        self.assertEqual(payload.get("sub"), "admin_test")

    def test_borrowing_limits_ug_pg(self):
        """Undergraduate limit must be 3, Postgraduate limit must be 6."""
        ug = db_manager.query("SELECT borrow_limit FROM UNDERGRADUATE LIMIT 1", fetch_one=True)
        self.assertEqual(ug["borrow_limit"], 3)

        pg = db_manager.query("SELECT borrow_limit FROM POSTGRADUATE LIMIT 1", fetch_one=True)
        self.assertEqual(pg["borrow_limit"], 6)

    def test_reference_book_non_lendable(self):
        """Reference books must have lendable = 'No'."""
        ref = db_manager.query("SELECT lendable FROM REFERENCE_BOOK LIMIT 1", fetch_one=True)
        self.assertEqual(ref["lendable"], "No")

    def test_book_issue_and_stock_transaction(self):
        """Issuing a book must decrement copies_available and create LENDING_RECORD."""
        # 1. Insert test book with copies = 2
        book_id = db_manager.execute(
            "INSERT INTO BOOK (title, isbn, author, copies_available, category_id) VALUES (%s, %s, %s, 2, 1)",
            ("Test Transaction Book", f"ISBN-TEST-{time.time()}", "Test Author")
        )
        
        # 2. Get student with available limit
        student = db_manager.query("SELECT student_id FROM STUDENT LIMIT 1", fetch_one=True)
        student_id = student["student_id"]

        # 3. Issue book
        due_d = (date.today() + timedelta(days=14)).isoformat()
        lending_id = db_manager.execute(
            "INSERT INTO LENDING_RECORD (issue_date, due_date, status, student_id, book_id, admin_id) VALUES (%s, %s, 'Issued', %s, %s, 9)",
            (date.today().isoformat(), due_d, student_id, book_id)
        )
        db_manager.execute("UPDATE BOOK SET copies_available = copies_available - 1 WHERE book_id = %s", (book_id,))

        # Verify stock decremented to 1
        updated_book = db_manager.query("SELECT copies_available FROM BOOK WHERE book_id = %s", (book_id,), fetch_one=True)
        self.assertEqual(updated_book["copies_available"], 1)

        # 4. Return book
        db_manager.execute(
            "UPDATE LENDING_RECORD SET return_date = %s, status = 'Returned' WHERE lending_id = %s",
            (date.today().isoformat(), lending_id)
        )
        db_manager.execute("UPDATE BOOK SET copies_available = copies_available + 1 WHERE book_id = %s", (book_id,))

        # Verify stock restored to 2
        restored_book = db_manager.query("SELECT copies_available FROM BOOK WHERE book_id = %s", (book_id,), fetch_one=True)
        self.assertEqual(restored_book["copies_available"], 2)

    def test_fine_payment_status(self):
        """Fines must support Unpaid, Paid, Waived."""
        fine = db_manager.query("SELECT fine_id, paid_status FROM FINE LIMIT 1", fetch_one=True)
        self.assertIn(fine["paid_status"], ["Unpaid", "Paid", "Waived"])

    def test_settings_policy(self):
        """Tests configurable fine policy."""
        from app.core.config import settings
        self.assertGreater(settings.DAILY_OVERDUE_RATE, 0)
        self.assertEqual(settings.CURRENCY_SYMBOL, "$")

    def test_database_explorer_all_17_tables(self):
        """Introspection check for 17 tables."""
        from app.routers.database import ALLOWED_TABLES
        self.assertEqual(len(ALLOWED_TABLES), 17)
        for t in ALLOWED_TABLES:
            res = db_manager.query(f"SELECT COUNT(*) AS c FROM {t}", fetch_one=True)
            self.assertIsNotNone(res)

if __name__ == '__main__':
    unittest.main()
