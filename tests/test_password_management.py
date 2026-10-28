import urllib.request
import urllib.error
import json
import pymysql

def run_test():
    # Reset Student 1 password in MySQL to NULL for a clean test
    conn = pymysql.connect(host='127.0.0.1', port=3306, user='root', password='12345', database='library_lending_db')
    with conn.cursor() as cur:
        cur.execute("UPDATE student SET password = NULL WHERE student_id = 1;")
        conn.commit()
    conn.close()
    print("Step 0: Set Student 1 password to NULL in MySQL")

    # 1. Student 1 logs in for first time without password
    login_data = json.dumps({'identifier': '1'}).encode('utf-8')
    req = urllib.request.Request('http://127.0.0.1:8000/api/auth/student-login', data=login_data, headers={'Content-Type': 'application/json'})
    resp = json.loads(urllib.request.urlopen(req).read().decode('utf-8'))
    print("Step 1 (First-Time Login Check):", resp.get('message'))
    assert resp.get('needs_password_setup') is True, "Expected needs_password_setup to be True!"

    # 2. Student 1 sets up password
    setup_data = json.dumps({'identifier': '1', 'new_password': 'AaravPassword@2026'}).encode('utf-8')
    req = urllib.request.Request('http://127.0.0.1:8000/api/auth/student-setup-password', data=setup_data, headers={'Content-Type': 'application/json'})
    setup_resp = json.loads(urllib.request.urlopen(req).read().decode('utf-8'))
    print("Step 2 (Password Setup):", setup_resp.get('message'))
    assert 'access_token' in setup_resp, "Expected token in setup response"

    # Verify bcrypt hash saved in MySQL
    conn = pymysql.connect(host='127.0.0.1', port=3306, user='root', password='12345', database='library_lending_db')
    with conn.cursor() as cur:
        cur.execute("SELECT password FROM student WHERE student_id = 1;")
        db_hash = cur.fetchone()[0]
    conn.close()
    print(f"Step 2 (MySQL Direct Check): Hash stored in MySQL: {db_hash[:20]}...")
    assert db_hash and db_hash.startswith('$2'), "Hash in MySQL must be standard bcrypt!"

    # 3. Subsequent login with WRONG password -> MUST BE REJECTED
    wrong_login = json.dumps({'identifier': '1', 'password': 'WrongPassword123'}).encode('utf-8')
    req = urllib.request.Request('http://127.0.0.1:8000/api/auth/student-login', data=wrong_login, headers={'Content-Type': 'application/json'})
    try:
        urllib.request.urlopen(req)
        assert False, "Login with wrong password should have failed!"
    except urllib.error.HTTPError as e:
        print(f"Step 3 (Wrong Password Test): Correctly rejected with HTTP {e.code}: {e.read().decode('utf-8')}")
        assert e.code == 401, f"Expected 401, got {e.code}"

    # 4. Subsequent login with CORRECT password -> MUST BE PERMITTED
    correct_login = json.dumps({'identifier': '1', 'password': 'AaravPassword@2026'}).encode('utf-8')
    req = urllib.request.Request('http://127.0.0.1:8000/api/auth/student-login', data=correct_login, headers={'Content-Type': 'application/json'})
    correct_resp = json.loads(urllib.request.urlopen(req).read().decode('utf-8'))
    print("Step 4 (Correct Password Test): Entry Permitted! Token generated for:", correct_resp.get('name'))
    assert 'access_token' in correct_resp, "Expected token for correct login"

    # 5. Admin portal password check
    admin_wrong = json.dumps({'username': 'admin_rajesh', 'password': 'WrongPassword'}).encode('utf-8')
    req = urllib.request.Request('http://127.0.0.1:8000/api/auth/login', data=admin_wrong, headers={'Content-Type': 'application/json'})
    try:
        urllib.request.urlopen(req)
        assert False, "Admin login with wrong password should fail!"
    except urllib.error.HTTPError as e:
        print(f"Step 5 (Admin Wrong Password): Correctly rejected with HTTP {e.code}")

    admin_correct = json.dumps({'username': 'admin_rajesh', 'password': 'Admin@123'}).encode('utf-8')
    req = urllib.request.Request('http://127.0.0.1:8000/api/auth/login', data=admin_correct, headers={'Content-Type': 'application/json'})
    admin_resp = json.loads(urllib.request.urlopen(req).read().decode('utf-8'))
    print("Step 5 (Admin Correct Password): Permitted! Token generated for:", admin_resp.get('name'))

    print("\n>>> ALL PASSWORD MANAGEMENT AND ENFORCEMENT TESTS PASSED 100%! <<<")

if __name__ == '__main__':
    run_test()
