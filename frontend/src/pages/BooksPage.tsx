import React, { useEffect, useState, useCallback } from 'react';
import {
  BookOpen,
  Search,
  Filter,
  Plus,
  Edit2,
  Trash2,
  Eye,
  RefreshCw,
  PlusCircle,
  MinusCircle,
  ChevronLeft,
  ChevronRight,
  BookmarkCheck,
  History,
  ArrowLeftRight
} from 'lucide-react';
import { api } from '../services/api';
import { Modal } from '../components/Modal';
import { ConfirmModal } from '../components/ConfirmModal';
import { Badge, StatusBadge } from '../components/Badge';
import { useToast } from '../components/Toast';
import type { Book, Category } from '../types';

export const BooksPage: React.FC<{ onQuickIssueBook?: (bookId: number) => void }> = ({ onQuickIssueBook }) => {
  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedClassification, setSelectedClassification] = useState<string>('');
  const [sortBy, setSortBy] = useState('book_id');
  const [sortOrder, setSortOrder] = useState('desc');
  const [isLoading, setIsLoading] = useState(false);

  // Modals state
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailedBook, setDetailedBook] = useState<Book | null>(null);
  const [deleteBookTarget, setDeleteBookTarget] = useState<Book | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    isbn: '',
    author: '',
    copies_available: 1,
    category_id: 1,
    subclass_type: 'standard' as 'standard' | 'textbook' | 'reference_book' | 'journal',
    edition: '',
    lendable: 'No' as 'No' | 'Yes',
    issue_no: 1,
    volume_no: 1,
  });

  const { success, error } = useToast();

  const fetchBooks = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.getBooks({
        search,
        category_id: selectedCategory || undefined,
        classification: selectedClassification || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
        page,
        limit,
      });
      setBooks(res.items);
      setTotal(res.total);
    } catch (err: any) {
      error(err.message || 'Failed to fetch catalog books');
    } finally {
      setIsLoading(false);
    }
  }, [search, selectedCategory, selectedClassification, sortBy, sortOrder, page, limit]);

  const fetchCategories = async () => {
    try {
      const res = await api.getCategories();
      setCategories(res);
      if (res.length > 0 && !formData.category_id) {
        setFormData((prev) => ({ ...prev, category_id: res[0].category_id }));
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  const handleOpenAdd = () => {
    setEditingBook(null);
    setFormData({
      title: '',
      isbn: '',
      author: '',
      copies_available: 1,
      category_id: categories[0]?.category_id || 1,
      subclass_type: 'standard',
      edition: '',
      lendable: 'No',
      issue_no: 1,
      volume_no: 1,
    });
    setIsAddEditOpen(true);
  };

  const handleOpenEdit = (b: Book) => {
    setEditingBook(b);
    let subType: any = 'standard';
    if (b.subclass_type === 'Textbook') subType = 'textbook';
    else if (b.subclass_type === 'Reference Book') subType = 'reference_book';
    else if (b.subclass_type === 'Journal') subType = 'journal';

    setFormData({
      title: b.title,
      isbn: b.isbn,
      author: b.author,
      copies_available: b.copies_available,
      category_id: b.category_id,
      subclass_type: subType,
      edition: b.edition || '',
      lendable: b.lendable || 'No',
      issue_no: b.issue_no || 1,
      volume_no: b.volume_no || 1,
    });
    setIsAddEditOpen(true);
  };

  const handleSaveBook = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingBook) {
        await api.updateBook(editingBook.book_id, formData);
        success('Book details updated successfully');
      } else {
        await api.createBook(formData);
        success('New book registered in catalog');
      }
      setIsAddEditOpen(false);
      fetchBooks();
      fetchCategories();
    } catch (err: any) {
      error(err.message || 'Operation failed');
    }
  };

  const handleOpenDetail = async (bookId: number) => {
    try {
      const details = await api.getBook(bookId);
      setDetailedBook(details);
      setIsDetailOpen(true);
    } catch (err: any) {
      error('Failed to load book complete details');
    }
  };

  const handleDelete = async () => {
    if (!deleteBookTarget) return;
    try {
      await api.deleteBook(deleteBookTarget.book_id);
      success(`Book "${deleteBookTarget.title}" deleted from catalog`);
      setDeleteBookTarget(null);
      fetchBooks();
      fetchCategories();
    } catch (err: any) {
      error(err.message || 'Failed to delete book');
    }
  };

  const handleQuickAdjustCopies = async (b: Book, delta: number) => {
    const newCopies = b.copies_available + delta;
    if (newCopies < 0) return;
    try {
      await api.updateBook(b.book_id, { copies_available: newCopies });
      setBooks((prev) =>
        prev.map((item) => (item.book_id === b.book_id ? { ...item, copies_available: newCopies } : item))
      );
      success(`Updated copies of "${b.title}" to ${newCopies}`);
    } catch (err: any) {
      error(err.message || 'Failed to update stock');
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Book Catalog Management</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Browse, classify, update stock and manage textbooks, reference books and journals.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchBooks()}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            title="Refresh Catalog Stock"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs shadow-indigo-600/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Book</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search title, author, ISBN, ID..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Category filter */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-700"
            >
              <option value="">All Categories ({categories.length})</option>
              {categories.map((c) => (
                <option key={c.category_id} value={c.category_id}>
                  {c.category_name}
                </option>
              ))}
            </select>
          </div>

          {/* Subclass filter */}
          <div>
            <select
              value={selectedClassification}
              onChange={(e) => {
                setSelectedClassification(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-700"
            >
              <option value="">All Classifications</option>
              <option value="standard">Standard Books</option>
              <option value="textbook">Textbooks (Edition)</option>
              <option value="reference">Reference Books (Lendable = No)</option>
              <option value="journal">Journals (Volume/Issue)</option>
            </select>
          </div>

          {/* Sort selection */}
          <div className="flex gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-700"
            >
              <option value="book_id">Sort by Book ID</option>
              <option value="title">Sort by Title</option>
              <option value="author">Sort by Author</option>
              <option value="copies_available">Sort by Stock</option>
            </select>
            <button
              onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-semibold text-slate-700 transition"
              title="Toggle sort direction"
            >
              {sortOrder.toUpperCase()}
            </button>
          </div>
        </div>
      </div>

      {/* Books Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/80 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200/80">
              <tr>
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">Title & Details</th>
                <th className="px-6 py-4">Author</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Classification</th>
                <th className="px-6 py-4 text-center">Copies</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-normal">
              {isLoading && books.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                    Loading books catalog...
                  </td>
                </tr>
              ) : books.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    <BookOpen className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    No books found matching the current search and filter criteria.
                  </td>
                </tr>
              ) : (
                books.map((b) => (
                  <tr key={b.book_id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs font-bold text-slate-400">#{b.book_id}</td>
                    <td className="px-6 py-4 max-w-xs">
                      <div className="font-semibold text-slate-900 truncate" title={b.title}>
                        {b.title}
                      </div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">ISBN: {b.isbn}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-700 text-xs">{b.author}</td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-medium text-slate-800 bg-slate-100 px-2.5 py-1 rounded-md">
                        {b.category_name}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <Badge
                          variant={
                            b.subclass_type === 'Textbook'
                              ? 'primary'
                              : b.subclass_type === 'Reference Book'
                              ? 'warning'
                              : b.subclass_type === 'Journal'
                              ? 'info'
                              : 'neutral'
                          }
                          size="sm"
                        >
                          {b.subclass_type}
                        </Badge>
                        {b.edition && (
                          <div className="text-[11px] text-slate-500 italic">Ed: {b.edition}</div>
                        )}
                        {b.lendable && (
                          <div className="text-[11px] text-amber-600 font-semibold">
                            Lendable: {b.lendable} (In-library only)
                          </div>
                        )}
                        {b.volume_no && (
                          <div className="text-[11px] text-slate-500 font-mono">
                            Vol {b.volume_no}, Iss {b.issue_no}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg">
                        <button
                          onClick={() => handleQuickAdjustCopies(b, -1)}
                          disabled={b.copies_available <= 0}
                          className="text-slate-400 hover:text-rose-600 disabled:opacity-30"
                          title="Decrease copy"
                        >
                          <MinusCircle className="w-3.5 h-3.5" />
                        </button>
                        <span
                          className={`font-bold font-mono text-xs ${
                            b.copies_available === 0 ? 'text-rose-600' : 'text-slate-900'
                          }`}
                        >
                          {b.copies_available}
                        </span>
                        <button
                          onClick={() => handleQuickAdjustCopies(b, 1)}
                          className="text-slate-400 hover:text-emerald-600"
                          title="Increase copy"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {onQuickIssueBook && b.copies_available > 0 && b.lendable !== 'No' && (
                          <button
                            onClick={() => onQuickIssueBook(b.book_id)}
                            className="p-1.5 rounded-lg text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 transition"
                            title="Issue this book to a student"
                          >
                            <ArrowLeftRight className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenDetail(b.book_id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                          title="View history and details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(b)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition"
                          title="Edit book"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteBookTarget(b)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          title="Delete book"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing {books.length > 0 ? (page - 1) * limit + 1 : 0} to{' '}
            {Math.min(page * limit, total)} of {total} titles
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

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isAddEditOpen}
        onClose={() => setIsAddEditOpen(false)}
        title={editingBook ? `Edit Book #${editingBook.book_id}` : 'Add New Book to Catalog'}
        subtitle="Enforces 3NF category constraints and EER subclass attributes"
      >
        <form onSubmit={handleSaveBook} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Book Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              placeholder="e.g. Database System Concepts"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                ISBN *
              </label>
              <input
                type="text"
                required
                value={formData.isbn}
                onChange={(e) => setFormData({ ...formData, isbn: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-mono"
                placeholder="e.g. 978-0078022159"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Copies Available *
              </label>
              <input
                type="number"
                min="0"
                required
                value={formData.copies_available}
                onChange={(e) => setFormData({ ...formData, copies_available: parseInt(e.target.value) || 0 })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Author(s) *
            </label>
            <input
              type="text"
              required
              value={formData.author}
              onChange={(e) => setFormData({ ...formData, author: e.target.value })}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              placeholder="e.g. Abraham Silberschatz, Henry F. Korth"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Academic Category (3NF) *
            </label>
            <select
              value={formData.category_id}
              onChange={(e) => setFormData({ ...formData, category_id: parseInt(e.target.value) })}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            >
              {categories.map((c) => (
                <option key={c.category_id} value={c.category_id}>
                  {c.category_name}
                </option>
              ))}
            </select>
          </div>

          {/* Subclass entity selection */}
          <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-100 space-y-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-indigo-900 mb-1.5">
                EER Subclass Specialization
              </label>
              <select
                value={formData.subclass_type}
                onChange={(e: any) => setFormData({ ...formData, subclass_type: e.target.value })}
                disabled={!!editingBook} // Primary specialization defined at creation
                className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl text-xs sm:text-sm font-medium text-indigo-950 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="standard">Standard Catalog Book</option>
                <option value="textbook">Textbook (Course Edition)</option>
                <option value="reference_book">Reference Book (Lendable = No)</option>
                <option value="journal">Journal (Academic Periodical)</option>
              </select>
            </div>

            {formData.subclass_type === 'textbook' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Edition</label>
                <input
                  type="text"
                  required
                  value={formData.edition}
                  onChange={(e) => setFormData({ ...formData, edition: e.target.value })}
                  placeholder="e.g. 7th International Edition"
                  className="w-full px-3 py-1.5 bg-white border border-indigo-200 rounded-lg text-xs"
                />
              </div>
            )}

            {formData.subclass_type === 'reference_book' && (
              <div className="text-xs text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                <strong>Rule Enforced:</strong> Reference books are restricted to in-library reading only.
                Database check constraint: <code className="bg-amber-100 px-1 py-0.5 rounded">lendable = 'No'</code>.
              </div>
            )}

            {formData.subclass_type === 'journal' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Volume No</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.volume_no}
                    onChange={(e) => setFormData({ ...formData, volume_no: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-1.5 bg-white border border-indigo-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Issue No</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.issue_no}
                    onChange={(e) => setFormData({ ...formData, issue_no: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-1.5 bg-white border border-indigo-200 rounded-lg text-xs"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddEditOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition"
            >
              {editingBook ? 'Save Changes' : 'Create Book'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Book Detailed View Modal (With Lending History & Reservations) */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={detailedBook?.title || 'Book Details'}
        subtitle={`Book ID: #${detailedBook?.book_id} • Classification: ${detailedBook?.subclass_type}`}
        maxWidth="xl"
      >
        {detailedBook && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200/80">
              <div>
                <span className="text-slate-500">Author:</span>
                <div className="font-semibold text-slate-900 mt-0.5">{detailedBook.author}</div>
              </div>
              <div>
                <span className="text-slate-500">ISBN:</span>
                <div className="font-mono font-semibold text-slate-900 mt-0.5">{detailedBook.isbn}</div>
              </div>
              <div>
                <span className="text-slate-500">Category:</span>
                <div className="font-semibold text-slate-900 mt-0.5">{detailedBook.category_name}</div>
              </div>
              <div>
                <span className="text-slate-500">Stock Availability:</span>
                <div className="font-bold text-slate-900 mt-0.5">{detailedBook.copies_available} copies</div>
              </div>
            </div>

            {/* Active Reservations for this book */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2 mb-2">
                <BookmarkCheck className="w-4 h-4 text-amber-600" />
                Active Student Reservation Queue ({detailedBook.reservations?.length || 0})
              </h4>
              {detailedBook.reservations?.length === 0 ? (
                <p className="text-xs text-slate-400 bg-slate-50 p-3 rounded-lg text-center">
                  No pending student reservations for this title.
                </p>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                  {detailedBook.reservations?.map((res, idx) => (
                    <div key={idx} className="p-3 text-xs flex items-center justify-between bg-white">
                      <div>
                        <span className="font-semibold text-slate-900">{res.student_name}</span>
                        <span className="text-slate-500 ml-2">({res.student_email})</span>
                      </div>
                      <span className="text-slate-400 font-mono">{res.reserve_date}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Historical Circulation Transactions */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2 mb-2">
                <History className="w-4 h-4 text-indigo-600" />
                Lending History Records ({detailedBook.lending_history?.length || 0})
              </h4>
              {detailedBook.lending_history?.length === 0 ? (
                <p className="text-xs text-slate-400 bg-slate-50 p-3 rounded-lg text-center">
                  No lending history recorded yet for this book.
                </p>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                  {detailedBook.lending_history?.map((hist) => (
                    <div key={hist.lending_id} className="p-3 text-xs flex items-center justify-between bg-white">
                      <div>
                        <div className="font-semibold text-slate-900">{hist.student_name}</div>
                        <div className="text-[11px] text-slate-500">
                          Issued: {hist.issue_date} • Due: {hist.due_date}
                        </div>
                      </div>
                      <StatusBadge status={hist.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteBookTarget}
        onClose={() => setDeleteBookTarget(null)}
        onConfirm={handleDelete}
        title="Delete Book Record"
        message={`Are you sure you want to delete "${deleteBookTarget?.title}"? Note: Deletion will be rejected by the database if past lending transactions reference this book (FK Restrict).`}
        confirmText="Delete Book"
        variant="danger"
      />
    </div>
  );
};
