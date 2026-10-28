import React, { useEffect, useState, useCallback } from 'react';
import {
  ArrowLeftRight,
  Search,
  Plus,
  CheckCircle,
  AlertCircle,
  Clock,
  RefreshCw,
  BookOpen,
  User,
  Calendar,
  ChevronLeft,
  ChevronRight,
  DollarSign
} from 'lucide-react';
import { api } from '../services/api';
import { Modal } from '../components/Modal';
import { ReceiptModal } from '../components/ReceiptModal';
import { StatusBadge } from '../components/Badge';
import { useToast } from '../components/Toast';
import { Printer } from 'lucide-react';
import type { LendingRecord, Student, Book } from '../types';

export const LendingPage: React.FC<{
  initialIssueOpen?: boolean;
  preSelectedBookId?: number | null;
  preSelectedStudentId?: number | null;
  onResetIssueModal?: () => void;
}> = ({
  initialIssueOpen = false,
  preSelectedBookId = null,
  preSelectedStudentId = null,
  onResetIssueModal,
}) => {
  const [records, setRecords] = useState<LendingRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Issue Modal
  const [isIssueOpen, setIsIssueOpen] = useState(initialIssueOpen);
  const [studentsList, setStudentsList] = useState<Student[]>([]);
  const [booksList, setBooksList] = useState<Book[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<number | ''>(preSelectedStudentId || '');
  const [selectedBookId, setSelectedBookId] = useState<number | ''>(preSelectedBookId || '');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14); // default 14-day borrowing period
    return d.toISOString().slice(0, 10);
  });

  useEffect(() => {
    if (initialIssueOpen) {
      loadDropdownData();
      if (preSelectedBookId) setSelectedBookId(preSelectedBookId);
      if (preSelectedStudentId) setSelectedStudentId(preSelectedStudentId);
      setIsIssueOpen(true);
    }
  }, [initialIssueOpen, preSelectedBookId, preSelectedStudentId]);

  // Return Modal
  const [isReturnOpen, setIsReturnOpen] = useState(false);
  const [returningRecord, setReturningRecord] = useState<LendingRecord | null>(null);
  const [returnDate, setReturnDate] = useState(new Date().toISOString().slice(0, 10));
  const [returnStatus, setReturnStatus] = useState<'Returned' | 'Damaged' | 'Lost'>('Returned');
  const [damageNote, setDamageNote] = useState('');
  const [damageFineAmount, setDamageFineAmount] = useState<number>(35.0);
  const [receiptRecord, setReceiptRecord] = useState<LendingRecord | null>(null);

  const { success, error } = useToast();

  const fetchRecords = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.getLendingRecords({
        search,
        status_filter: statusFilter || undefined,
        overdue_only: overdueOnly,
        page,
        limit,
      });
      setRecords(res.items);
      setTotal(res.total);
    } catch (err: any) {
      error(err.message || 'Failed to fetch circulation records');
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter, overdueOnly, page, limit]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // Load students and books for dropdowns
  const loadDropdownData = async () => {
    try {
      const [stuRes, bookRes] = await Promise.all([
        api.getStudents({ limit: 100 }),
        api.getBooks({ limit: 100 }),
      ]);
      setStudentsList(stuRes.items);
      setBooksList(bookRes.items);
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenIssueModal = () => {
    loadDropdownData();
    setSelectedStudentId('');
    setSelectedBookId('');
    setIssueDate(new Date().toISOString().slice(0, 10));
    const d = new Date();
    d.setDate(d.getDate() + 14);
    setDueDate(d.toISOString().slice(0, 10));
    setIsIssueOpen(true);
  };

  const handleIssueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !selectedBookId) {
      error('Please select both a student and an eligible book');
      return;
    }

    try {
      await api.issueBook({
        student_id: Number(selectedStudentId),
        book_id: Number(selectedBookId),
        issue_date: issueDate,
        due_date: dueDate,
      });
      success('Book issued successfully. Stock updated.');
      setIsIssueOpen(false);
      if (onResetIssueModal) onResetIssueModal();
      fetchRecords();
    } catch (err: any) {
      error(err.message || 'Failed to issue book');
    }
  };

  const handleOpenReturnModal = (r: LendingRecord) => {
    setReturningRecord(r);
    setReturnDate(new Date().toISOString().slice(0, 10));
    setReturnStatus('Returned');
    setDamageNote('');
    setDamageFineAmount(35.0);
    setIsReturnOpen(true);
  };

  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returningRecord) return;

    try {
      const res = await api.returnBook(returningRecord.lending_id, {
        return_date: returnDate,
        status: returnStatus,
        damage_note: returnStatus === 'Damaged' ? damageNote : undefined,
        damage_fine_amount: returnStatus === 'Damaged' ? damageFineAmount : undefined,
      });
      if (res.days_overdue > 0) {
        success(`Book returned. Overdue by ${res.days_overdue} days. Fine generated.`);
      } else {
        success('Return processed. Book stock incremented.');
      }
      setIsReturnOpen(false);
      fetchRecords();
    } catch (err: any) {
      error(err.message || 'Failed to process return');
    }
  };

  const selectedStudentObj = studentsList.find((s) => s.student_id === Number(selectedStudentId));
  const selectedBookObj = booksList.find((b) => b.book_id === Number(selectedBookId));

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Lending & Circulation Management</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Tracks issue dates, due dates, return statuses, stock decrements, and automatic overdue fine computations.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchRecords()}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            title="Refresh Circulation Records"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={handleOpenIssueModal}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs shadow-indigo-600/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Issue Book</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search student, book, ID..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-700"
            >
              <option value="">All Statuses</option>
              <option value="Issued">Issued (Active)</option>
              <option value="Returned">Returned</option>
              <option value="Overdue">Overdue</option>
              <option value="Damaged">Damaged</option>
              <option value="Lost">Lost</option>
            </select>
          </div>

          <div className="flex items-center">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={overdueOnly}
                onChange={(e) => {
                  setOverdueOnly(e.target.checked);
                  setPage(1);
                }}
                className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
              />
              <span className="text-rose-600">Overdue items requiring attention only</span>
            </label>
          </div>

          <div className="flex items-center justify-end text-xs text-slate-500">
            Total {total} circulation record(s)
          </div>
        </div>
      </div>

      {/* Lending Records Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/80 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200/80">
              <tr>
                <th className="px-6 py-4">Lending ID</th>
                <th className="px-6 py-4">Borrower Student</th>
                <th className="px-6 py-4">Book Title</th>
                <th className="px-6 py-4">Issue & Due Date</th>
                <th className="px-6 py-4">Return Date</th>
                <th className="px-6 py-4">Status & Fine</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-normal">
              {isLoading && records.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                    Loading circulation history...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    <ArrowLeftRight className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    No lending records found.
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r.lending_id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs font-bold text-slate-400">#{r.lending_id}</td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{r.student_name}</div>
                      <div className="text-xs text-slate-500 font-mono">ID: #{r.student_id}</div>
                    </td>
                    <td className="px-6 py-4 max-w-xs">
                      <div className="font-semibold text-slate-900 truncate" title={r.book_title}>
                        {r.book_title}
                      </div>
                      <div className="text-xs text-slate-500">By {r.admin_name}</div>
                    </td>
                    <td className="px-6 py-4 text-xs font-mono">
                      <div>Issued: {r.issue_date}</div>
                      <div className="text-slate-500 font-medium">Due: {r.due_date}</div>
                    </td>
                    <td className="px-6 py-4 text-xs font-mono">
                      {r.return_date ? (
                        <span className="text-emerald-700 font-semibold">{r.return_date}</span>
                      ) : (
                        <span className="text-slate-400 italic">Not Returned</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <StatusBadge status={r.status} />
                        {r.fine_amount ? (
                          <div className="text-xs font-semibold text-rose-600 flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            <span>${Number(r.fine_amount).toFixed(2)} ({r.fine_status})</span>
                          </div>
                        ) : r.days_overdue && r.days_overdue > 0 ? (
                          <div className="text-[11px] text-rose-600 font-semibold">
                            {r.days_overdue} days late (~${Number(r.calculated_overdue_fine).toFixed(2)})
                          </div>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setReceiptRecord(r)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
                          title="Print Circulation Slip"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        {!r.return_date && r.status !== 'Returned' && (
                          <button
                            onClick={() => handleOpenReturnModal(r)}
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition"
                          >
                            Process Return
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing {records.length > 0 ? (page - 1) * limit + 1 : 0} to{' '}
            {Math.min(page * limit, total)} of {total} records
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-slate-700">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Issue Book Modal */}
      <Modal
        isOpen={isIssueOpen}
        onClose={() => {
          setIsIssueOpen(false);
          if (onResetIssueModal) onResetIssueModal();
        }}
        title="Issue Book to Student"
        subtitle="Enforces undergraduate (3 books) & postgraduate (6 books) limits and stock availability"
        maxWidth="lg"
      >
        <form onSubmit={handleIssueSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Select Student *
            </label>
            <select
              required
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(Number(e.target.value) || '')}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            >
              <option value="">-- Choose a student --</option>
              {studentsList.map((s) => (
                <option key={s.student_id} value={s.student_id}>
                  #{s.student_id} - {s.name} ({s.student_type}, Active: {s.active_borrows_count}/{s.borrow_limit})
                </option>
              ))}
            </select>
            {selectedStudentObj && (
              <div className="mt-2 text-xs bg-slate-100 p-2.5 rounded-lg flex items-center justify-between">
                <span>Degree: <strong>{selectedStudentObj.student_type}</strong></span>
                <span className={selectedStudentObj.active_borrows_count >= selectedStudentObj.borrow_limit ? 'text-rose-600 font-bold' : 'text-emerald-700 font-bold'}>
                  Current Active: {selectedStudentObj.active_borrows_count} / {selectedStudentObj.borrow_limit} books allowed
                </span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Select Book Title *
            </label>
            <select
              required
              value={selectedBookId}
              onChange={(e) => setSelectedBookId(Number(e.target.value) || '')}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            >
              <option value="">-- Choose a catalog book --</option>
              {booksList.map((b) => (
                <option
                  key={b.book_id}
                  value={b.book_id}
                  disabled={b.copies_available <= 0 || b.lendable === 'No'}
                >
                  #{b.book_id} - {b.title} ({b.subclass_type}, Available: {b.copies_available}
                  {b.lendable === 'No' ? ' - NON-LENDABLE REF' : ''})
                </option>
              ))}
            </select>
            {selectedBookObj && (
              <div className="mt-2 text-xs bg-slate-100 p-2.5 rounded-lg flex items-center justify-between">
                <span>Category: <strong>{selectedBookObj.category_name}</strong></span>
                <span className={selectedBookObj.copies_available === 0 ? 'text-rose-600 font-bold' : 'text-emerald-700 font-bold'}>
                  Stock In Library: {selectedBookObj.copies_available} copies
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Issue Date *
              </label>
              <input
                type="date"
                required
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Due Date *
              </label>
              <input
                type="date"
                required
                value={dueDate}
                min={issueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setIsIssueOpen(false);
                if (onResetIssueModal) onResetIssueModal();
              }}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition"
            >
              Issue Book & Decrement Stock
            </button>
          </div>
        </form>
      </Modal>

      {/* Return Book Modal */}
      <Modal
        isOpen={isReturnOpen}
        onClose={() => setIsReturnOpen(false)}
        title={`Process Book Return #${returningRecord?.lending_id}`}
        subtitle={`Book: ${returningRecord?.book_title} • Borrower: ${returningRecord?.student_name}`}
      >
        <form onSubmit={handleReturnSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Actual Return Date *
            </label>
            <input
              type="date"
              required
              value={returnDate}
              onChange={(e) => setReturnDate(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 font-mono"
            />
            {returningRecord && returnDate > returningRecord.due_date && (
              <p className="text-xs text-rose-600 font-medium mt-1">
                Notice: Scheduled due date was {returningRecord.due_date}. An overdue fine ($1.50/day) will be calculated.
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Return Condition Status *
            </label>
            <select
              value={returnStatus}
              onChange={(e: any) => setReturnStatus(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
            >
              <option value="Returned">Normal Returned (Good Condition)</option>
              <option value="Damaged">Damaged (Assessment Required)</option>
              <option value="Lost">Lost by Borrower</option>
            </select>
          </div>

          {returnStatus === 'Damaged' && (
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-amber-900 mb-1">
                  Damage Assessment Note (DAMAGE_FINE) *
                </label>
                <textarea
                  required
                  rows={2}
                  value={damageNote}
                  onChange={(e) => setDamageNote(e.target.value)}
                  placeholder="e.g. Water damage to cover and spine, pages torn..."
                  className="w-full p-2 bg-white border border-amber-300 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-amber-900 mb-1">
                  Damage Fine Amount ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={damageFineAmount}
                  onChange={(e) => setDamageFineAmount(parseFloat(e.target.value) || 0)}
                  className="w-full p-2 bg-white border border-amber-300 rounded-lg text-xs font-mono"
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsReturnOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition"
            >
              Confirm Return & Restore Stock
            </button>
          </div>
        </form>
      </Modal>

      {/* Circulation Receipt Modal */}
      <ReceiptModal
        isOpen={!!receiptRecord}
        onClose={() => setReceiptRecord(null)}
        record={receiptRecord}
      />
    </div>
  );
};
