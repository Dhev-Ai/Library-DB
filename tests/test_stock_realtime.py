import urllib.request
import json

def run_test():
    # 1. Login to get token
    login_data = json.dumps({'username': 'admin_rajesh', 'password': 'Admin@123'}).encode('utf-8')
    req = urllib.request.Request('http://127.0.0.1:8000/api/auth/login', data=login_data, headers={'Content-Type': 'application/json'})
    resp = urllib.request.urlopen(req)
    token = json.loads(resp.read().decode('utf-8'))['access_token']
    headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}

    # 2. Dynamically pick first lendable book with stock > 0
    req = urllib.request.Request('http://127.0.0.1:8000/api/books', headers=headers)
    books = json.loads(urllib.request.urlopen(req).read().decode('utf-8'))['items']
    target_book = None
    for b in books:
        if b['copies_available'] > 0 and b.get('lendable') != 'No':
            target_book = b
            break

    assert target_book is not None, "No lendable book found!"
    target_book_id = target_book['book_id']
    initial_copies = target_book['copies_available']
    print(f"Testing Book #{target_book_id} ('{target_book['title']}')")
    print(f"Current available copies: {initial_copies}")

    # Pick an eligible student (e.g., student 1: Aarav Sharma)
    target_student_id = 1

    # 3. Issue the book to student
    issue_data = json.dumps({
        'student_id': target_student_id,
        'book_id': target_book_id,
        'issue_date': '2026-10-28',
        'due_date': '2026-11-11'
    }).encode('utf-8')
    req = urllib.request.Request('http://127.0.0.1:8000/api/lending/issue', data=issue_data, headers=headers)
    issue_resp = json.loads(urllib.request.urlopen(req).read().decode('utf-8'))
    lending_id = issue_resp['lending_id']
    print(f"Lending transaction created! ID: {lending_id}")

    # 4. Check book copies immediately in database
    req = urllib.request.Request(f'http://127.0.0.1:8000/api/books/{target_book_id}', headers=headers)
    book_after_issue = json.loads(urllib.request.urlopen(req).read().decode('utf-8'))
    after_issue_copies = book_after_issue['copies_available']
    print(f"Copies after lending: {after_issue_copies} (Decreased by exactly 1: {after_issue_copies == initial_copies - 1})")
    assert after_issue_copies == initial_copies - 1, f"Expected {initial_copies - 1}, got {after_issue_copies}"

    # 5. Return the book
    return_data = json.dumps({
        'return_date': '2026-10-28',
        'status': 'Returned'
    }).encode('utf-8')
    req = urllib.request.Request(f'http://127.0.0.1:8000/api/lending/{lending_id}/return', data=return_data, headers=headers)
    return_resp = json.loads(urllib.request.urlopen(req).read().decode('utf-8'))
    print(f"Return processed: {return_resp.get('message')}")

    # 6. Check book copies immediately in database after return
    req = urllib.request.Request(f'http://127.0.0.1:8000/api/books/{target_book_id}', headers=headers)
    book_after_return = json.loads(urllib.request.urlopen(req).read().decode('utf-8'))
    after_return_copies = book_after_return['copies_available']
    print(f"Copies after return: {after_return_copies} (Restored back: {after_return_copies == initial_copies})")
    assert after_return_copies == initial_copies, f"Expected {initial_copies}, got {after_return_copies}"

    print("\n>>> ALL CHECKS PASSED: Real-time book stock decrement on lend and increment on return works perfectly! <<<")

if __name__ == '__main__':
    run_test()
