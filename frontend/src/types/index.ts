export interface AuthUser {
  role?: 'admin' | 'student';
  admin_id?: number;
  student_id?: number;
  name: string;
  email: string;
  username?: string;
  department?: string;
  student_type?: string;
  borrow_limit?: number;
  join_year?: number;
  active_borrows_count?: number;
  phone_numbers?: string[];
}

export interface StudentPortalBook extends Book {
  is_currently_borrowed_by_me: boolean;
  is_lendable: boolean;
  can_borrow: boolean;
}

export interface StudentLoanRecord {
  lending_id: number;
  book_id: number;
  book_title: string;
  book_author: string;
  isbn: string;
  category_name: string;
  issue_date: string;
  due_date: string;
  return_date?: string | null;
  status: string;
  days_remaining: number;
  is_overdue: boolean;
  fine_id?: number | null;
  fine_amount?: number | null;
  fine_status?: string | null;
}

export interface AuthResponse {
  access_token?: string;
  token_type?: string;
  admin_id?: number;
  student_id?: number;
  username?: string;
  name?: string;
  role?: 'admin' | 'student';
  needs_password_setup?: boolean;
  message?: string;
  department?: string;
  student_type?: string;
  borrow_limit?: number;
  join_year?: number;
  active_borrows_count?: number;
}

export interface Book {
  book_id: number;
  title: string;
  isbn: string;
  author: string;
  copies_available: number;
  category_id: number;
  category_name?: string;
  subclass_type: 'Standard Book' | 'Textbook' | 'Reference Book' | 'Journal';
  catalog_classification: string;
  edition?: string;
  lendable?: 'No' | 'Yes';
  issue_no?: number;
  volume_no?: number;
  lending_history?: any[];
  reservations?: any[];
}

export interface Category {
  category_id: number;
  category_name: string;
  book_count: number;
}

export interface Student {
  student_id: number;
  name: string;
  email: string;
  department: string;
  join_year: number;
  student_type: 'Undergraduate' | 'Postgraduate' | string;
  borrow_limit: number;
  research_area?: string;
  phone_numbers: string[];
  active_borrows_count: number;
  total_unpaid_fines: number;
}

export interface LendingRecord {
  lending_id: number;
  student_id: number;
  student_name: string;
  book_id: number;
  book_title: string;
  admin_id: number;
  admin_name: string;
  issue_date: string;
  due_date: string;
  return_date?: string | null;
  status: 'Issued' | 'Returned' | 'Overdue' | 'Damaged' | 'Lost';
  days_overdue?: number;
  calculated_overdue_fine?: number;
  fine_id?: number;
  fine_amount?: number;
  fine_status?: 'Unpaid' | 'Paid' | 'Waived';
  damage_note?: string;
}

export interface Reservation {
  student_id: number;
  student_name: string;
  student_email?: string;
  book_id: number;
  book_title: string;
  copies_available: number;
  reserve_date: string;
}

export interface Fine {
  fine_id: number;
  lending_id: number;
  student_id: number;
  student_name: string;
  student_email?: string;
  book_id: number;
  book_title: string;
  amount: number;
  paid_status: 'Unpaid' | 'Paid' | 'Waived';
  issue_date: string;
  due_date: string;
  return_date?: string | null;
  damage_note?: string;
  days_overdue?: number;
  fine_type: 'Damage' | 'Overdue' | 'Standard Fine';
}

export interface SavedReport {
  report_id: number;
  report_type: string;
  generated_date: string;
  admin_id: number;
  admin_name: string;
}

export interface HealthInfo {
  status: string;
  database_engine: string;
  mysql_connected: boolean;
  mysql_error?: string | null;
  database_name: string;
  host: string;
  port: number;
}
