-- =============================================================================
-- Library Lending Management System - Phase 2 Database Implementation
-- DML Script: Data Population, Sample Operations (CRUD Demonstration)
-- Standard: MySQL 8.0+ / MariaDB 10.5+
-- =============================================================================

USE library_lending_db;

-- Disable foreign key checks temporarily for clean insertion if re-running
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE OVERDUE_FINE;
TRUNCATE TABLE DAMAGE_FINE;
TRUNCATE TABLE FINE;
TRUNCATE TABLE RESERVES;
TRUNCATE TABLE LENDING_RECORD;
TRUNCATE TABLE JOURNAL;
TRUNCATE TABLE REFERENCE_BOOK;
TRUNCATE TABLE TEXTBOOK;
TRUNCATE TABLE BOOK;
TRUNCATE TABLE CATEGORY;
TRUNCATE TABLE REPORT;
TRUNCATE TABLE POSTGRADUATE;
TRUNCATE TABLE UNDERGRADUATE;
TRUNCATE TABLE ADMIN;
TRUNCATE TABLE STUDENT;
TRUNCATE TABLE PERSON_PHONE;
TRUNCATE TABLE PERSON;
SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================================
-- 1. INSERT DATA INTO PERSON (Superclass)
-- =============================================================================
-- IDs 1 to 5: Undergraduate Students
-- IDs 6 to 8: Postgraduate Students
-- IDs 9 to 11: Admins (Librarians)
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
(11, 'Manoj Kulkarni', 'manoj.kulkarni@vitlibrary.ac.in');

-- =============================================================================
-- 2. INSERT DATA INTO PERSON_PHONE (Multi-valued phones from 1NF)
-- =============================================================================
INSERT INTO PERSON_PHONE (person_id, phone_number) VALUES
(1, '+91-9840112345'),
(1, '+91-9840198765'), -- Aarav has two phones
(2, '+91-9876543210'),
(3, '+91-9789012345'),
(4, '+91-9444123456'),
(5, '+91-9381234567'),
(6, '+91-9820123456'),
(6, '+91-9820987654'), -- Vikram has two phones
(7, '+91-9967123456'),
(8, '+91-9123456789'),
(9, '+91-9841001122'),
(10, '+91-9841002233'),
(11, '+91-9841003344');

-- =============================================================================
-- 3. INSERT DATA INTO STUDENT (Subclass of PERSON)
-- =============================================================================
INSERT INTO STUDENT (student_id, department, join_year) VALUES
(1, 'Computer Science & Engineering', 2023),
(2, 'Artificial Intelligence & Data Science', 2023),
(3, 'Electronics & Communication', 2024),
(4, 'Mechanical Engineering', 2024),
(5, 'Information Technology', 2023),
(6, 'Computer Science & Engineering', 2022),
(7, 'Electrical & Electronics', 2021),
(8, 'Data Science & Analytics', 2022);

-- =============================================================================
-- 4. INSERT DATA INTO UNDERGRADUATE (Subclass of STUDENT, borrow_limit = 3)
-- =============================================================================
INSERT INTO UNDERGRADUATE (student_id, borrow_limit) VALUES
(1, 3),
(2, 3),
(3, 3),
(4, 3),
(5, 3);

-- =============================================================================
-- 5. INSERT DATA INTO POSTGRADUATE (Subclass of STUDENT, borrow_limit = 6)
-- =============================================================================
INSERT INTO POSTGRADUATE (student_id, borrow_limit, research_area) VALUES
(6, 6, 'Distributed Systems & Cloud Computing'),
(7, 6, 'Smart Grid Energy Optimization'),
(8, 6, 'Natural Language Processing and LLMs');

-- =============================================================================
-- 6. INSERT DATA INTO ADMIN (Subclass of PERSON)
-- Passwords represented as secure salted hashes
-- =============================================================================
INSERT INTO ADMIN (admin_id, username, password) VALUES
(9, 'admin_rajesh', '$2y$10$e8wZ3o.QZ39.Y7eN59aZyei420yV4GvKj/9Lp5vE36/x9y.f'),
(10, 'admin_sangeetha', '$2y$10$w8gZ3o.QZ39.Y7eN59aZyei420yV4GvKj/9Lp5vE36/x9y.b'),
(11, 'admin_manoj', '$2y$10$k3hZ3o.QZ39.Y7eN59aZyei420yV4GvKj/9Lp5vE36/x9y.m');

-- =============================================================================
-- 7. INSERT DATA INTO REPORT
-- =============================================================================
INSERT INTO REPORT (report_id, report_type, generated_date, admin_id) VALUES
(1, 'Monthly Circulation Summary - Sep 2026', '2026-09-30 18:30:00', 9),
(2, 'Overdue & Defaulters Audit Report', '2026-10-05 10:15:00', 10),
(3, 'Damage & Lost Inventory Report Q3', '2026-10-10 14:00:00', 11),
(4, 'High Demand Books & Reservation Backlog', '2026-10-14 09:00:00', 9);

-- =============================================================================
-- 8. INSERT DATA INTO CATEGORY (3NF separation)
-- =============================================================================
INSERT INTO CATEGORY (category_id, category_name) VALUES
(1, 'Computer Science & Software Engineering'),
(2, 'Artificial Intelligence & Machine Learning'),
(3, 'Electronics & Hardware Systems'),
(4, 'Mathematics & Statistics'),
(5, 'Mechanical & Robotics Engineering');

-- =============================================================================
-- 9. INSERT DATA INTO BOOK (Catalog)
-- =============================================================================
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

-- =============================================================================
-- 10. INSERT DATA INTO TEXTBOOK (Subclass of BOOK)
-- =============================================================================
INSERT INTO TEXTBOOK (book_id, edition) VALUES
(101, '7th International Edition'),
(102, '10th Edition'),
(103, '4th Global Edition'),
(104, '4th Edition'),
(109, '1st Edition (Reprint 2024)'),
(110, '2nd Edition');

-- =============================================================================
-- 11. INSERT DATA INTO REFERENCE_BOOK (Subclass of BOOK, lendable = 'No')
-- =============================================================================
INSERT INTO REFERENCE_BOOK (book_id, lendable) VALUES
(105, 'No'),
(106, 'No');

-- =============================================================================
-- 12. INSERT DATA INTO JOURNAL (Subclass of BOOK)
-- =============================================================================
INSERT INTO JOURNAL (book_id, issue_no, volume_no) VALUES
(107, 6, 48),
(108, 2, 51);

-- =============================================================================
-- 13. INSERT DATA INTO RESERVES (M:N Reservation)
-- =============================================================================
INSERT INTO RESERVES (student_id, book_id, reserve_date) VALUES
(1, 104, '2026-10-10 11:20:00'),
(2, 103, '2026-10-11 15:45:00'),
(6, 101, '2026-10-12 09:10:00'),
(7, 107, '2026-10-13 16:30:00');

-- =============================================================================
-- 14. INSERT DATA INTO LENDING_RECORD
-- =============================================================================
INSERT INTO LENDING_RECORD (lending_id, issue_date, due_date, return_date, status, student_id, book_id, admin_id) VALUES
-- Transaction 1: Returned on time
(201, '2026-09-01', '2026-09-15', '2026-09-14', 'Returned', 1, 101, 9),
-- Transaction 2: Returned late with overdue
(202, '2026-09-05', '2026-09-19', '2026-09-27', 'Returned', 2, 102, 10),
-- Transaction 3: Returned damaged
(203, '2026-09-10', '2026-09-24', '2026-09-23', 'Damaged', 3, 104, 9),
-- Transaction 4: Currently overdue (active)
(204, '2026-09-15', '2026-09-29', NULL, 'Overdue', 4, 103, 11),
-- Transaction 5: Currently active and within due date
(205, '2026-10-05', '2026-10-19', NULL, 'Issued', 6, 109, 9),
-- Transaction 6: Active lending for postgraduate
(206, '2026-10-08', '2026-10-22', NULL, 'Issued', 8, 101, 10);

-- =============================================================================
-- 15. INSERT DATA INTO FINE (1:1 with LENDING_RECORD)
-- =============================================================================
INSERT INTO FINE (fine_id, amount, paid_status, lending_id) VALUES
-- Fine for Lending 202: 8 days overdue @ $1.50/day = 12.00
(301, 12.00, 'Paid', 202),
-- Fine for Lending 203: Water damage to cover and pages
(302, 35.00, 'Unpaid', 203),
-- Fine for Lending 204: 15 days overdue @ $1.50/day = 22.50
(303, 22.50, 'Unpaid', 204);

-- =============================================================================
-- 16. INSERT DATA INTO DAMAGE_FINE (Subclass of FINE)
-- =============================================================================
INSERT INTO DAMAGE_FINE (fine_id, damage_note) VALUES
(302, 'Severe water damage to chapters 3 and 4, binding partially detached.');

-- =============================================================================
-- 17. INSERT DATA INTO OVERDUE_FINE (Subclass of FINE)
-- =============================================================================
INSERT INTO OVERDUE_FINE (fine_id, days_overdue) VALUES
(301, 8),
(303, 15);

-- =============================================================================
-- 18. CRUD OPERATIONS DEMONSTRATION & VERIFICATION QUERIES
-- =============================================================================

-- [CREATE] New Student and Undergraduate Record
INSERT INTO PERSON (person_id, name, email) VALUES (12, 'Pranav Verma', 'pranav.verma@vitstudent.ac.in');
INSERT INTO PERSON_PHONE (person_id, phone_number) VALUES (12, '+91-9840998877');
INSERT INTO STUDENT (student_id, department, join_year) VALUES (12, 'Mechanical Engineering', 2024);
INSERT INTO UNDERGRADUATE (student_id, borrow_limit) VALUES (12, 3);

-- [READ] View Full Student Profile with Degree Level & Multi-phones
SELECT 
    p.person_id,
    p.name,
    p.email,
    s.department,
    s.join_year,
    CASE 
        WHEN ug.student_id IS NOT NULL THEN 'Undergraduate'
        WHEN pg.student_id IS NOT NULL THEN 'Postgraduate'
        ELSE 'Unknown'
    END AS degree_level,
    COALESCE(ug.borrow_limit, pg.borrow_limit) AS max_borrow_limit,
    pg.research_area,
    GROUP_CONCAT(pp.phone_number SEPARATOR ', ') AS contact_numbers
FROM PERSON p
JOIN STUDENT s ON p.person_id = s.student_id
LEFT JOIN UNDERGRADUATE ug ON s.student_id = ug.student_id
LEFT JOIN POSTGRADUATE pg ON s.student_id = pg.student_id
LEFT JOIN PERSON_PHONE pp ON p.person_id = pp.person_id
GROUP BY p.person_id, p.name, p.email, s.department, s.join_year, degree_level, max_borrow_limit, pg.research_area;

-- [READ] Comprehensive Book Catalog with Subclass Details & Categories
SELECT 
    b.book_id,
    b.title,
    b.isbn,
    b.author,
    c.category_name,
    b.copies_available,
    CASE 
        WHEN tb.book_id IS NOT NULL THEN CONCAT('Textbook (Ed: ', tb.edition, ')')
        WHEN rb.book_id IS NOT NULL THEN CONCAT('Reference Book (Lendable: ', rb.lendable, ')')
        WHEN jn.book_id IS NOT NULL THEN CONCAT('Journal (Vol: ', jn.volume_no, ', Issue: ', jn.issue_no, ')')
        ELSE 'Standard Book'
    END AS catalog_classification
FROM BOOK b
JOIN CATEGORY c ON b.category_id = c.category_id
LEFT JOIN TEXTBOOK tb ON b.book_id = tb.book_id
LEFT JOIN REFERENCE_BOOK rb ON b.book_id = rb.book_id
LEFT JOIN JOURNAL jn ON b.book_id = jn.book_id;

-- [READ] Active Lending Records with Borrowers, Admins, and Calculated Fines
SELECT 
    lr.lending_id,
    p_stu.name AS student_name,
    b.title AS book_title,
    p_adm.name AS issued_by_admin,
    lr.issue_date,
    lr.due_date,
    lr.return_date,
    lr.status,
    f.fine_id,
    f.amount AS fine_amount,
    f.paid_status,
    df.damage_note,
    ofn.days_overdue
FROM LENDING_RECORD lr
JOIN STUDENT s ON lr.student_id = s.student_id
JOIN PERSON p_stu ON s.student_id = p_stu.person_id
JOIN BOOK b ON lr.book_id = b.book_id
JOIN ADMIN a ON lr.admin_id = a.admin_id
JOIN PERSON p_adm ON a.admin_id = p_adm.person_id
LEFT JOIN FINE f ON lr.lending_id = f.lending_id
LEFT JOIN DAMAGE_FINE df ON f.fine_id = df.fine_id
LEFT JOIN OVERDUE_FINE ofn ON f.fine_id = ofn.fine_id;

-- [UPDATE] Process Book Return & Update Book Stock Quantity
UPDATE LENDING_RECORD 
SET return_date = '2026-10-14', status = 'Returned'
WHERE lending_id = 205;

UPDATE BOOK
SET copies_available = copies_available + 1
WHERE book_id = 109;

-- [UPDATE] Pay an Outstanding Fine
UPDATE FINE
SET paid_status = 'Paid'
WHERE fine_id = 302;

-- [DELETE] Cancel a Reservation
DELETE FROM RESERVES 
WHERE student_id = 1 AND book_id = 104;
