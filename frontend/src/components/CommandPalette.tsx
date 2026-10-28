import React, { useState, useEffect } from 'react';
import { Search, BookOpen, User, ArrowLeftRight, X, ArrowUpRight } from 'lucide-react';
import { api } from '../services/api';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: any) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, onNavigate }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ books: any[]; students: any[]; lending: any[] }>({
    books: [],
    students: [],
    lending: [],
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // Trigger open
        }
      }
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults({ books: [], students: [], lending: [] });
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.globalSearch(query);
        setResults(res);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4">
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-150">
        <div className="flex items-center px-4 py-3.5 border-b border-slate-100 bg-slate-50/50">
          <Search className="w-5 h-5 text-slate-400 mr-3" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search books, authors, students, loans across university database..."
            className="flex-1 bg-transparent text-sm focus:outline-hidden text-slate-900 placeholder-slate-400"
          />
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto space-y-4">
          {loading && (
            <div className="text-center py-6 text-xs text-slate-400 font-mono">
              Querying database indices...
            </div>
          )}

          {!loading && !query && (
            <div className="text-center py-8 text-xs text-slate-400">
              Type at least 2 characters to search across catalog titles, ISBNs, registered students and circulation records.
            </div>
          )}

          {/* Books Result */}
          {results.books.length > 0 && (
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                <span>Books ({results.books.length})</span>
              </div>
              <div className="space-y-1">
                {results.books.map((b) => (
                  <div
                    key={b.book_id}
                    onClick={() => {
                      onNavigate('books');
                      onClose();
                    }}
                    className="p-2.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 cursor-pointer flex items-center justify-between text-xs transition"
                  >
                    <div>
                      <div className="font-semibold text-slate-900">{b.title}</div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        by {b.author} • ISBN: {b.isbn}
                      </div>
                    </div>
                    <span className="font-mono px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold">
                      {b.copies_available} copies
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Students Result */}
          {results.students.length > 0 && (
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-emerald-500" />
                <span>Students ({results.students.length})</span>
              </div>
              <div className="space-y-1">
                {results.students.map((s) => (
                  <div
                    key={s.student_id}
                    onClick={() => {
                      onNavigate('students');
                      onClose();
                    }}
                    className="p-2.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 cursor-pointer flex items-center justify-between text-xs transition"
                  >
                    <div>
                      <div className="font-semibold text-slate-900">{s.name}</div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {s.email} • {s.department}
                      </div>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-slate-400" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Lending Result */}
          {results.lending.length > 0 && (
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                <ArrowLeftRight className="w-3.5 h-3.5 text-blue-500" />
                <span>Circulation Records ({results.lending.length})</span>
              </div>
              <div className="space-y-1">
                {results.lending.map((l) => (
                  <div
                    key={l.lending_id}
                    onClick={() => {
                      onNavigate('lending');
                      onClose();
                    }}
                    className="p-2.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 cursor-pointer flex items-center justify-between text-xs transition"
                  >
                    <div>
                      <div className="font-semibold text-slate-900">{l.book_title}</div>
                      <div className="text-[11px] text-slate-500">
                        Borrower: {l.student_name} • Due: {l.due_date}
                      </div>
                    </div>
                    <span className="font-semibold px-2 py-0.5 rounded-md text-[11px] bg-slate-100 text-slate-700">
                      {l.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {query && !loading && results.books.length === 0 && results.students.length === 0 && results.lending.length === 0 && (
            <div className="text-center py-6 text-xs text-slate-400">
              No matching records found in database for "{query}".
            </div>
          )}
        </div>

        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <span>Search shortcuts: Press ESC to close</span>
          <span>Tip: Global Database Indexing Active</span>
        </div>
      </div>
    </div>
  );
};
