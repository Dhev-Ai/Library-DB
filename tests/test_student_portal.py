import urllib.request
import json
import pymysql

def get_mysql_copies(book_id=101):
    conn = pymysql.connect(host='127.0.0.1', port=3306, user='root', password='12345', database='library_lending_db')
    with conn.cursor() as cur:
        cur.execute('SELECT copies_available FROM book WHERE book_id = %s;', (book_id,))
        val = cur.fetchone()[0]
    conn.close()
    return val

def test_student_portal():
    # 1. Student Login (Student 1: Aarav Sharma)
    login_data = json.dumps({'identifier': '1'}).encode('utf-8')
    req = urllib.request.Request('http://127.0.0.1:8000/api/auth/student-login', data=login_data, headers={'Content-Type': 'application/json'})
    resp = urllib.request.urlopen(req)
    student_auth = json.loads(resp.read().decode('utf-8'))
    token = student_auth['access_token']
    print(f"Student Logged in: {student_auth['name']} ({student_auth['student_type']}) | Borrow limit: {student_auth['borrow_limit']}")
    headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}

    # 2. Check initial copies in MySQL for Book 101
    init_copies = get_mysql_copies(101)
    print(f"Initial MySQL copies for Book 101: {init_copies}")

    # 3. Student borrows Book 101
    borrow_data = json.dumps({'book_id': 101}).encode('utf-8')
    req_borrow = urllib.request.Request('http://127.0.0.1:8000/api/student-portal/borrow', data=borrow_data, headers=headers)
    borrow_res = json.loads(urllib.request.urlopen(req_borrow).read().decode('utf-8'))
    lending_id = borrow_res['lending_id']
    print(f"Borrow Successful! Lending ID: {lending_id}")

    # Verify decrement in MySQL
    after_borrow = get_mysql_copies(101)
    print(f"MySQL copies after student borrow: {after_borrow} (Decremented by 1: {after_borrow == init_copies - 1})")
    assert after_borrow == init_copies - 1, "Stock did not decrement in MySQL!"

    # 4. Student returns Book 101
    req_return = urllib.request.Request(f'http://127.0.0.1:8000/api/student-portal/return/{lending_id}', data=b'{}', headers=headers)
    return_res = json.loads(urllib.request.urlopen(req_return).read().decode('utf-8'))
    print(f"Return Successful: {return_res['message']}")

    # Verify restoration in MySQL
    after_return = get_mysql_copies(101)
    print(f"MySQL copies after student return: {after_return} (Restored back: {after_return == init_copies})")
    assert after_return == init_copies, "Stock did not restore in MySQL!"

    print("\n>>> ALL CHECKS PASSED: Real-time MySQL decrement on student borrow and increment on return verified 100%! <<<")

if __name__ == '__main__':
    test_student_portal()
