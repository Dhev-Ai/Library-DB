import React, { useEffect, useState, useCallback } from 'react';
import { DollarSign, Search, CheckCircle, Ban, RefreshCw, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '../services/api';
import { KpiCard } from '../components/KpiCard';
import { StatusBadge } from '../components/Badge';
import { ConfirmModal } from '../components/ConfirmModal';
import { useToast } from '../components/Toast';
import type { Fine } from '../types';

export const FinesPage: React.FC = () => {
  const [fines, setFines] = useState<Fine[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState('');
  const [paidStatus, setPaidStatus] = useState<string>('');
  const [fineType, setFineType] = useState<string>('');
  const [summary, setSummary] = useState({ total_unpaid: 0, total_paid: 0, total_waived: 0 });
  const [isLoading, setIsLoading] = useState(false);

  // Status change action
  const [actionTarget, setActionTarget] = useState<{ fine: Fine; newStatus: 'Paid' | 'Waived' } | null>(null);

  const { success, error } = useToast();

  const fetchFines = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.getFines({
        search,
        paid_status: paidStatus || undefined,
        fine_type: fineType || undefined,
        page,
        limit,
      });
      setFines(res.items);
      setTotal(res.total);
      if (res.summary) setSummary(res.summary);
    } catch (err: any) {
      error(err.message || 'Failed to load fines');
    } finally {
      setIsLoading(false);
    }
  }, [search, paidStatus, fineType, page, limit]);

  useEffect(() => {
    fetchFines();
  }, [fetchFines]);

  const handleConfirmAction = async () => {
    if (!actionTarget) return;
    try {
      await api.updateFineStatus(actionTarget.fine.fine_id, actionTarget.newStatus);
      success(`Fine #${actionTarget.fine.fine_id} marked as ${actionTarget.newStatus}`);
      setActionTarget(null);
      fetchFines();
    } catch (err: any) {
      error(err.message || 'Failed to update fine status');
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Fine & Penalty Management</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Tracks overdue fines ($1.50/day standard rate) and assessed damage fines linked 1:1 with circulation records.
          </p>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          title="Outstanding Fines"
          value={`$${Number(summary.total_unpaid || 0).toFixed(2)}`}
          subtitle="Pending student payment"
          icon={AlertCircle}
          color="rose"
        />
        <KpiCard
          title="Collected Revenue"
          value={`$${Number(summary.total_paid || 0).toFixed(2)}`}
          subtitle="Successfully cleared & paid"
          icon={CheckCircle}
          color="emerald"
        />
        <KpiCard
          title="Waived Penalties"
          value={`$${Number(summary.total_waived || 0).toFixed(2)}`}
          subtitle="Approved admin waivers"
          icon={Ban}
          color="sky"
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search student, book, fine ID..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <select
              value={paidStatus}
              onChange={(e) => {
                setPaidStatus(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-700"
            >
              <option value="">All Payment Statuses</option>
              <option value="Unpaid">Unpaid Only</option>
              <option value="Paid">Paid Only</option>
              <option value="Waived">Waived Only</option>
            </select>
          </div>

          <div>
            <select
              value={fineType}
              onChange={(e) => {
                setFineType(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-700"
            >
              <option value="">All Fine Types</option>
              <option value="overdue">Overdue Penalties (OVERDUE_FINE)</option>
              <option value="damage">Damage Penalties (DAMAGE_FINE)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Fines Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/80 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200/80">
              <tr>
                <th className="px-6 py-4">Fine ID</th>
                <th className="px-6 py-4">Student Borrower</th>
                <th className="px-6 py-4">Book Title</th>
                <th className="px-6 py-4">Fine Type & Reason</th>
                <th className="px-6 py-4">Amount ($)</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-normal">
              {isLoading && fines.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                    Loading fine records...
                  </td>
                </tr>
              ) : fines.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    <DollarSign className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    No fine records found matching filters.
                  </td>
                </tr>
              ) : (
                fines.map((f) => (
                  <tr key={f.fine_id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs font-bold text-slate-400">#{f.fine_id}</td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{f.student_name}</div>
                      <div className="text-xs text-slate-500 font-mono">Student ID: #{f.student_id}</div>
                    </td>
                    <td className="px-6 py-4 max-w-xs">
                      <div className="font-semibold text-slate-900 truncate" title={f.book_title}>
                        {f.book_title}
                      </div>
                      <div className="text-xs text-slate-500 font-mono">Lending #{f.lending_id}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-0.5">
                        <span className="font-semibold text-xs text-slate-900">{f.fine_type} Fine</span>
                        {f.days_overdue && (
                          <div className="text-xs text-slate-500">{f.days_overdue} days overdue ($1.50/day)</div>
                        )}
                        {f.damage_note && (
                          <div className="text-xs text-amber-700 italic max-w-xs truncate" title={f.damage_note}>
                            {f.damage_note}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold font-mono text-slate-900 text-sm">
                      ${Number(f.amount).toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={f.paid_status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      {f.paid_status === 'Unpaid' ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setActionTarget({ fine: f, newStatus: 'Paid' })}
                            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition"
                          >
                            Mark Paid
                          </button>
                          <button
                            onClick={() => setActionTarget({ fine: f, newStatus: 'Waived' })}
                            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200 transition"
                          >
                            Waive
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 font-mono">Settled</span>
                      )}
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
            Showing {fines.length > 0 ? (page - 1) * limit + 1 : 0} to{' '}
            {Math.min(page * limit, total)} of {total} fines
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

      {/* Status Confirmation Modal */}
      <ConfirmModal
        isOpen={!!actionTarget}
        onClose={() => setActionTarget(null)}
        onConfirm={handleConfirmAction}
        title={actionTarget?.newStatus === 'Paid' ? 'Mark Fine as Paid' : 'Waive Penalty'}
        message={
          actionTarget?.newStatus === 'Paid'
            ? `Confirm receipt of payment for Fine #${actionTarget?.fine.fine_id} ($${actionTarget?.fine.amount}) by ${actionTarget?.fine.student_name}?`
            : `Are you sure you want to waive the penalty of $${actionTarget?.fine.amount} for ${actionTarget?.fine.student_name}?`
        }
        confirmText={actionTarget?.newStatus === 'Paid' ? 'Confirm Payment' : 'Waive Fine'}
        variant={actionTarget?.newStatus === 'Paid' ? 'primary' : 'warning'}
      />
    </div>
  );
};
