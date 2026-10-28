const API_BASE = '/api';

export class ApiError extends Error {
  status: number;
  data: any;
  constructor(message: string, status: number, data?: any) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

export function getToken(): string | null {
  return localStorage.getItem('auth_token');
}

export function setToken(token: string) {
  localStorage.setItem('auth_token', token);
}

export function removeToken() {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_user');
}

export async function request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const errorMsg = (data && data.detail) || response.statusText || 'Request failed';
    throw new ApiError(errorMsg, response.status, data);
  }

  return data as T;
}

export const api = {
  // Auth
  login: (credentials: { username: string; password: string }) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  adminSetupPassword: (data: { username: string; new_password: string }) =>
    request('/auth/admin-setup-password', { method: 'POST', body: JSON.stringify(data) }),
  studentLogin: (data: { identifier: string; password?: string }) =>
    request('/auth/student-login', { method: 'POST', body: JSON.stringify(data) }),
  studentSetupPassword: (data: { identifier: string; new_password: string }) =>
    request('/auth/student-setup-password', { method: 'POST', body: JSON.stringify(data) }),
  getMe: () => request('/auth/me'),
  getHealth: () => request('/auth/health'),

  // Student Self-Service Portal
  getStudentProfile: () => request('/student-portal/me'),
  getStudentCatalog: (params: Record<string, any> = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') query.append(k, String(v));
    });
    return request(`/student-portal/books?${query.toString()}`);
  },
  studentBorrowBook: (book_id: number) =>
    request('/student-portal/borrow', { method: 'POST', body: JSON.stringify({ book_id }) }),
  studentReturnBook: (lending_id: number) =>
    request(`/student-portal/return/${lending_id}`, { method: 'POST' }),
  getStudentLoans: () => request('/student-portal/my-loans'),

  // Dashboard
  getDashboardSummary: () => request('/dashboard/summary'),

  // Books
  getBooks: (params: Record<string, any> = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') query.append(k, String(v));
    });
    return request(`/books?${query.toString()}`);
  },
  getBook: (id: number) => request(`/books/${id}`),
  createBook: (data: any) => request('/books', { method: 'POST', body: JSON.stringify(data) }),
  updateBook: (id: number, data: any) => request(`/books/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteBook: (id: number) => request(`/books/${id}`, { method: 'DELETE' }),

  // Categories
  getCategories: () => request('/categories'),
  createCategory: (data: { category_name: string }) => request('/categories', { method: 'POST', body: JSON.stringify(data) }),
  updateCategory: (id: number, data: { category_name: string }) => request(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCategory: (id: number) => request(`/categories/${id}`, { method: 'DELETE' }),

  // Students
  getStudents: (params: Record<string, any> = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') query.append(k, String(v));
    });
    return request(`/students?${query.toString()}`);
  },
  getStudent: (id: number) => request(`/students/${id}`),
  createStudent: (data: any) => request('/students', { method: 'POST', body: JSON.stringify(data) }),
  updateStudent: (id: number, data: any) => request(`/students/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteStudent: (id: number) => request(`/students/${id}`, { method: 'DELETE' }),

  // Admins
  getAdmins: () => request('/admins'),
  createAdmin: (data: any) => request('/admins', { method: 'POST', body: JSON.stringify(data) }),

  // Lending
  getLendingRecords: (params: Record<string, any> = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') query.append(k, String(v));
    });
    return request(`/lending?${query.toString()}`);
  },
  issueBook: (data: any) => request('/lending/issue', { method: 'POST', body: JSON.stringify(data) }),
  returnBook: (lendingId: number, data: any) =>
    request(`/lending/${lendingId}/return`, { method: 'POST', body: JSON.stringify(data) }),

  // Reservations
  getReservations: (params: Record<string, any> = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') query.append(k, String(v));
    });
    return request(`/reservations?${query.toString()}`);
  },
  createReservation: (data: { student_id: number; book_id: number }) =>
    request('/reservations', { method: 'POST', body: JSON.stringify(data) }),
  cancelReservation: (studentId: number, bookId: number) =>
    request(`/reservations/${studentId}/${bookId}`, { method: 'DELETE' }),

  // Fines
  getFines: (params: Record<string, any> = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') query.append(k, String(v));
    });
    return request(`/fines?${query.toString()}`);
  },
  updateFineStatus: (fineId: number, paid_status: 'Paid' | 'Waived') =>
    request(`/fines/${fineId}/status`, { method: 'PATCH', body: JSON.stringify({ paid_status }) }),

  // Reports
  getSavedReports: () => request('/reports/saved'),
  saveReport: (report_type: string) => request('/reports/save', { method: 'POST', body: JSON.stringify({ report_type }) }),
  getCirculationSummary: () => request('/reports/circulation-summary'),
  getOverdueDefaulters: () => request('/reports/overdue-defaulters'),
  getDamageLost: () => request('/reports/damage-lost'),
  getPopularBooks: () => request('/reports/popular-books'),
  getFineCollections: () => request('/reports/fine-collections'),
  getCategoryStatistics: () => request('/reports/category-statistics'),

  // Database Explorer
  getDatabaseTables: () => request('/database/tables'),
  getTableData: (tableName: string, page = 1, limit = 10) =>
    request(`/database/tables/${tableName}?page=${page}&limit=${limit}`),

  // Settings & Global Search
  getPolicy: () => request('/settings/policy'),
  updatePolicy: (data: { daily_overdue_rate: number; currency_symbol: string }) =>
    request('/settings/policy', { method: 'PUT', body: JSON.stringify(data) }),
  globalSearch: (q: string) => request(`/settings/global-search?q=${encodeURIComponent(q)}`),
};
