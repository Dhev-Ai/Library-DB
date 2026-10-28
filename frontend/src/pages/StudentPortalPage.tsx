import React, { useEffect, useState, useCallback } from 'react';
import {
  BookOpen,
  GraduationCap,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  LogOut,
  RefreshCw,
  Library,
  Bookmark,
  Calendar,
  Check,
  Ban,
  ArrowRight
} from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../components/Toast';
import type { AuthUser, StudentPortalBook, StudentLoanRecord, Category } from '../types';

interface StudentPortalPageProps {
  user: AuthUser;
  onLogout: () => void;
}

export const StudentPortalPage: React.FC<StudentPortalPageProps> = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'catalog' | 'loans' | 'history'>('catalog');
  const [profile, setProfile] = useState<any>(user);
  const [books, setBooks] = useState<StudentPortalBook[]>([]);
  const [loans, setLoans] = useState<StudentLoanRecord[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  const { success, error } = useToast();

  const fetchProfile = useCallback(async () => {
    try {
      const data = await api.getStudentProfile();
      setProfile(data);
    } catch (err: any) {
      console.error(err);
    }
  }, []);

  const fetchBooks = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await api.getStudentCatalog({
        search: search || undefined,
        category_id: selectedCategory || undefined,
      });
      setBooks(data);
    } catch (err: any) {
      error(err.message || 'Failed to load library catalog');
    } finally {
      setIsLoading(false);
    }
  }, [search, selectedCategory]);

  const fetchLoans = useCallback(async () => {
    try {
      const data = await api.getStudentLoans();
      setLoans(data);
    } catch (err: any) {
      console.error(err);
    }
  }, []);

  const fetchCategories = async () => {
    try {
      const data = await api.getCategories();
      setCategories(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchBooks();
    fetchLoans();
    fetchCategories();
  }, [fetchProfile, fetchBooks, fetchLoans]);

  const handleBorrow = async (book: StudentPortalBook) => {
    try {
      setActionLoadingId(book.book_id);
      const res = await api.studentBorrowBook(book.book_id);
      success(res.message || `Successfully borrowed "${book.title}"! Count decremented in MySQL.`);
      await Promise.all([fetchProfile(), fetchBooks(), fetchLoans()]);
    } catch (err: any) {
      error(err.message || 'Failed to borrow book');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReturn = async (loan: StudentLoanRecord) => {
    try {
      setActionLoadingId(loan.lending_id);
      const res = await api.studentReturnBook(loan.lending_id);
      success(res.message || `Successfully returned "${loan.book_title}"! Stock restored in MySQL.`);
      await Promise.all([fetchProfile(), fetchBooks(), fetchLoans()]);
    } catch (err: any) {
      error(err.message || 'Failed to return book');
    } finally {
      setActionLoadingId(null);
    }
  };

  const activeLoans = loans.filter((l) => l.status === 'Issued' || l.status === 'Overdue');
  const pastLoans = loans.filter((l) => l.status === 'Returned' || l.status === 'Damaged' || l.status === 'Lost');

  const maxLimit = profile?.borrow_limit || (profile?.student_type === 'Postgraduate' ? 6 : 3);
  const currentCount = profile?.active_borrows_count ?? activeLoans.length;
  const remainingQuota = Math.max(0, maxLimit - currentCount);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Top Student Header */}
      <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-linear-to-tr from-indigo-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Library className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight">University Library</span>
                <span className="text-[11px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <GraduationCap className="w-3 h-3" /> Student Portal
                </span>
              </div>
              <p className="text-xs text-slate-400">Database Systems Project • Live MySQL 8.0</p>
            </div>
          </div>

          {/* Student Profile & Quota Summary */}
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-semibold text-white">{profile?.name}</div>
              <div className="text-xs text-slate-400">
                {profile?.department} • <span className="text-indigo-400 font-medium">{profile?.student_type}</span>
              </div>
            </div>

            {/* Quota Badge */}
            <div className="bg-slate-800 border border-slate-700/80 px-3.5 py-1.5 rounded-xl flex items-center gap-2.5">
              <div className="text-right">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Borrow Quota</div>
                <div className="text-xs font-bold text-white">
                  <span className={remainingQuota === 0 ? 'text-amber-400' : 'text-emerald-400'}>
                    {currentCount} / {maxLimit}
                  </span>{' '}
                  Active Books
                </div>
              </div>
              <div className={`w-2.5 h-2.5 rounded-full ${remainingQuota > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            </div>

            <button
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition cursor-pointer"
              title="Logout from Student Portal"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('catalog')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition cursor-pointer ${
                activeTab === 'catalog'
                  ? 'bg-indigo-600 text-white shadow-xs shadow-indigo-600/30'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Browse & Borrow Books</span>
            </button>

            <button
              onClick={() => setActiveTab('loans')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition cursor-pointer relative ${
                activeTab === 'loans'
                  ? 'bg-indigo-600 text-white shadow-xs shadow-indigo-600/30'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Bookmark className="w-4 h-4" />
              <span>My Active Books</span>
              {activeLoans.length > 0 && (
                <span
                  className={`text-[11px] font-bold px-1.5 py-0.2 rounded-full ${
                    activeTab === 'loans' ? 'bg-white text-indigo-700' : 'bg-indigo-100 text-indigo-700'
                  }`}
                >
                  {activeLoans.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-indigo-600 text-white shadow-xs shadow-indigo-600/30'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>History & Fines</span>
            </button>
          </div>

          <button
            onClick={() => {
              fetchProfile();
              fetchBooks();
              fetchLoans();
            }}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Sync MySQL</span>
          </button>
        </div>

        {/* TAB 1: BROWSE & BORROW BOOKS */}
        {activeTab === 'catalog' && (
          <div className="space-y-6">
            {/* Search and Filters */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search book title, author, ISBN..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.category_id} value={c.category_id}>
                    {c.category_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Quota Notice Banner */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                  {remainingQuota}
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-indigo-950">
                    {remainingQuota > 0
                      ? `You are eligible to borrow ${remainingQuota} more book${remainingQuota > 1 ? 's' : ''}`
                      : `You have reached your borrowing limit of ${maxLimit} books`}
                  </h4>
                  <p className="text-[11px] sm:text-xs text-indigo-700">
                    Degree Policy: {profile?.student_type} borrowers can hold up to {maxLimit} simultaneously issued books.
                  </p>
                </div>
              </div>
            </div>

            {/* Books Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {books.map((b) => {
                const isBorrowingThis = actionLoadingId === b.book_id;
                const canStudentBorrow = b.can_borrow && remainingQuota > 0;

                return (
                  <div
                    key={b.book_id}
                    className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition p-5 flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                          #{b.book_id} • {b.category_name}
                        </span>

                        {b.copies_available > 0 ? (
                          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                            <Check className="w-3 h-3" /> {b.copies_available} in stock
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                            <Ban className="w-3 h-3" /> Out of stock
                          </span>
                        )}
                      </div>

                      <h3 className="font-bold text-slate-900 text-base leading-snug">{b.title}</h3>
                      <p className="text-xs text-slate-500">by {b.author}</p>

                      <div className="pt-1 flex flex-wrap gap-1.5 text-[11px]">
                        <span className="text-slate-500 font-mono bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                          ISBN: {b.isbn}
                        </span>
                        {b.edition && (
                          <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                            {b.edition}
                          </span>
                        )}
                        {!b.is_lendable && (
                          <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-semibold">
                            Reference (In-library only)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="pt-2 border-t border-slate-100">
                      {b.is_currently_borrowed_by_me ? (
                        <div className="w-full text-center py-2 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-xl">
                          Currently Borrowed by You
                        </div>
                      ) : !b.is_lendable ? (
                        <div className="w-full text-center py-2 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-xl">
                          Non-Lendable Reference Book
                        </div>
                      ) : b.copies_available <= 0 ? (
                        <button
                          disabled
                          className="w-full py-2 text-xs font-semibold text-slate-400 bg-slate-100 rounded-xl cursor-not-allowed"
                        >
                          Out of Stock
                        </button>
                      ) : remainingQuota <= 0 ? (
                        <button
                          disabled
                          className="w-full py-2 text-xs font-semibold text-slate-400 bg-slate-100 rounded-xl cursor-not-allowed"
                          title="Borrowing quota reached"
                        >
                          Limit Reached ({currentCount}/{maxLimit})
                        </button>
                      ) : (
                        <button
                          onClick={() => handleBorrow(b)}
                          disabled={isBorrowingThis}
                          className="w-full inline-flex items-center justify-center gap-2 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs shadow-indigo-600/20 transition cursor-pointer"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>{isBorrowingThis ? 'Updating MySQL...' : 'Borrow Book (-1 Copy)'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: MY ACTIVE BORROWED BOOKS */}
        {activeTab === 'loans' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">
                Currently Borrowed Books ({activeLoans.length})
              </h2>
            </div>

            {activeLoans.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
                <BookOpen className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="font-bold text-slate-700">No Active Borrowed Books</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  You currently have no books checked out. Switch to the Catalog tab to browse and borrow books.
                </p>
                <button
                  onClick={() => setActiveTab('catalog')}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition cursor-pointer"
                >
                  <span>Browse Catalog</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeLoans.map((loan) => {
                  const isReturning = actionLoadingId === loan.lending_id;

                  return (
                    <div
                      key={loan.lending_id}
                      className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col justify-between space-y-4 shadow-2xs"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold uppercase bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                            Lending ID #{loan.lending_id}
                          </span>

                          {loan.is_overdue ? (
                            <span className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" /> Overdue by {Math.abs(loan.days_remaining)} days
                            </span>
                          ) : (
                            <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Due in {loan.days_remaining} days
                            </span>
                          )}
                        </div>

                        <h3 className="font-bold text-slate-900 text-base">{loan.book_title}</h3>
                        <p className="text-xs text-slate-500">by {loan.book_author}</p>

                        <div className="text-xs text-slate-600 space-y-1 pt-2 border-t border-slate-100">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Issue Date:</span>
                            <span className="font-mono">{loan.issue_date}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Due Date:</span>
                            <span className="font-mono font-semibold text-slate-800">{loan.due_date}</span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-2">
                        <button
                          onClick={() => handleReturn(loan)}
                          disabled={isReturning}
                          className="w-full inline-flex items-center justify-center gap-2 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{isReturning ? 'Returning in MySQL...' : 'Return Book (+1 Copy to Stock)'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: BORROWING HISTORY & FINES */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm">Past Circulation Records & Fines</h3>
              <span className="text-xs text-slate-500">{pastLoans.length} total records</span>
            </div>

            {pastLoans.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No returned or past circulation records on file yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">ID</th>
                      <th className="px-4 py-3">Book Title</th>
                      <th className="px-4 py-3">Issued</th>
                      <th className="px-4 py-3">Returned</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Fine Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pastLoans.map((p) => (
                      <tr key={p.lending_id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-mono">#{p.lending_id}</td>
                        <td className="px-4 py-3 font-semibold text-slate-800">{p.book_title}</td>
                        <td className="px-4 py-3 text-slate-500 font-mono">{p.issue_date}</td>
                        <td className="px-4 py-3 text-slate-500 font-mono">{p.return_date || '-'}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-md font-semibold text-[11px] bg-emerald-50 text-emerald-700">
                            {p.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {p.fine_amount ? (
                            <span
                              className={`px-2 py-0.5 rounded-md font-semibold text-[11px] ${
                                p.fine_status === 'Paid'
                                  ? 'bg-slate-100 text-slate-600'
                                  : 'bg-rose-50 text-rose-700 font-bold'
                              }`}
                            >
                              ${p.fine_amount.toFixed(2)} ({p.fine_status})
                            </span>
                          ) : (
                            <span className="text-slate-400">None</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
