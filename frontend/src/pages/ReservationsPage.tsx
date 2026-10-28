import React, { useEffect, useState, useCallback } from 'react';
import { BookmarkCheck, Search, Plus, Trash2, RefreshCw, BookOpen, User, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '../services/api';
import { Modal } from '../components/Modal';
import { ConfirmModal } from '../components/ConfirmModal';
import { useToast } from '../components/Toast';
import type { Reservation, Student, Book } from '../types';

export const ReservationsPage: React.FC = () => {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Create modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<number | ''>('');
  const [selectedBook, setSelectedBook] = useState<number | ''>('');

  // Cancel target
  const [cancelTarget, setCancelTarget] = useState<Reservation | null>(null);

  const { success, error } = useToast();

  const fetchReservations = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.getReservations({ search, page, limit });
      setReservations(res.items);
      setTotal(res.total);
    } catch (err: any) {
      error(err.message || 'Failed to load reservations');
    } finally {
      setIsLoading(false);
    }
  }, [search, page, limit]);

  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  const handleOpenAdd = async () => {
    try {
      const [stuRes, bookRes] = await Promise.all([
        api.getStudents({ limit: 100 }),
        api.getBooks({ limit: 100 }),
      ]);
      setStudents(stuRes.items);
      setBooks(bookRes.items);
      setSelectedStudent('');
      setSelectedBook('');
      setIsAddOpen(true);
    } catch (err) {
      error('Failed to load selection data');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !selectedBook) return;

    try {
      await api.createReservation({
        student_id: Number(selectedStudent),
        book_id: Number(selectedBook),
      });
      success('Reservation placed successfully');
      setIsAddOpen(false);
      fetchReservations();
    } catch (err: any) {
      error(err.message || 'Failed to create reservation');
    }
  };

  const handleCancel = async () => {
    if (!cancelTarget) return;
    try {
      await api.cancelReservation(cancelTarget.student_id, cancelTarget.book_id);
      success('Reservation cancelled');
      setCancelTarget(null);
      fetchReservations();
    } catch (err: any) {
      error(err.message || 'Failed to cancel reservation');
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Book Reservation Management</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Tracks M:N RESERVES relation with composite primary key (student_id, book_id).
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs shadow-indigo-600/20 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Reservation</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by student name or book title..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex items-center justify-end text-xs text-slate-500">
            Total {total} active reservation(s) in queue
          </div>
        </div>
      </div>

      {/* Reservations Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/80 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200/80">
              <tr>
                <th className="px-6 py-4">Student Borrower</th>
                <th className="px-6 py-4">Reserved Book</th>
                <th className="px-6 py-4">Stock Availability</th>
                <th className="px-6 py-4">Reservation Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-normal">
              {isLoading && reservations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                    Loading reservations...
                  </td>
                </tr>
              ) : reservations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    <BookmarkCheck className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    No active student reservations.
                  </td>
                </tr>
              ) : (
                reservations.map((r, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{r.student_name}</div>
                      <div className="text-xs text-slate-500 font-mono">ID: #{r.student_id}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{r.book_title}</div>
                      <div className="text-xs text-slate-500 font-mono">Book ID: #{r.book_id}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${
                          r.copies_available > 0
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {r.copies_available > 0 ? `${r.copies_available} in stock (Ready)` : 'Waitlisted (0 in stock)'}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-700">{r.reserve_date}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setCancelTarget(r)}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition"
                      >
                        Cancel Reservation
                      </button>
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
            Showing {reservations.length > 0 ? (page - 1) * limit + 1 : 0} to{' '}
            {Math.min(page * limit, total)} of {total} reservations
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

      {/* Create Reservation Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Create Student Book Reservation"
        subtitle="Enforces composite primary key (student_id, book_id)"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Select Student *
            </label>
            <select
              required
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(Number(e.target.value) || '')}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">-- Choose student --</option>
              {students.map((s) => (
                <option key={s.student_id} value={s.student_id}>
                  #{s.student_id} - {s.name} ({s.department})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Select Book Title *
            </label>
            <select
              required
              value={selectedBook}
              onChange={(e) => setSelectedBook(Number(e.target.value) || '')}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">-- Choose book to reserve --</option>
              {books.map((b) => (
                <option key={b.book_id} value={b.book_id}>
                  #{b.book_id} - {b.title} (Stock: {b.copies_available})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition"
            >
              Place Reservation
            </button>
          </div>
        </form>
      </Modal>

      {/* Cancel Confirmation Modal */}
      <ConfirmModal
        isOpen={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleCancel}
        title="Cancel Student Reservation"
        message={`Confirm cancellation of reservation for "${cancelTarget?.book_title}" requested by ${cancelTarget?.student_name}?`}
        confirmText="Confirm Cancel"
        variant="warning"
      />
    </div>
  );
};
