import pymysql
import sqlite3
import os

def migrate():
    # 1. Migrate live MySQL
    try:
        conn = pymysql.connect(host='127.0.0.1', port=3306, user='root', password='12345', database='library_lending_db')
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='library_lending_db' AND TABLE_NAME='student' AND COLUMN_NAME='password';")
            if cur.fetchone()[0] == 0:
                cur.execute("ALTER TABLE student ADD COLUMN password VARCHAR(255) NULL;")
                conn.commit()
                print("MySQL: Added password column to student table.")
            else:
                print("MySQL: password column already exists on student table.")
        conn.close()
    except Exception as e:
        print("MySQL migration error:", e)

    # 2. Migrate SQLite fallback DB if present
    sqlite_path = os.path.join(os.path.dirname(__file__), "..", "..", "library_lending.db")
    if os.path.exists(sqlite_path):
        try:
            conn_sq = sqlite3.connect(sqlite_path)
            cur_sq = conn_sq.cursor()
            cur_sq.execute("PRAGMA table_info(STUDENT);")
            cols = [r[1] for r in cur_sq.fetchall()]
            if 'password' not in cols:
                cur_sq.execute("ALTER TABLE STUDENT ADD COLUMN password TEXT NULL;")
                conn_sq.commit()
                print("SQLite: Added password column to STUDENT table.")
            else:
                print("SQLite: password column already exists.")
            conn_sq.close()
        except Exception as e:
            print("SQLite migration error:", e)

if __name__ == '__main__':
    migrate()
