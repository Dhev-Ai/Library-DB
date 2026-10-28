import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  Copy,
  Users,
  GraduationCap,
  Award,
  ArrowLeftRight,
  AlertCircle,
  BookmarkCheck,
  DollarSign,
  ShieldCheck,
  RefreshCw,
  Clock,
  ArrowUpRight
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  Legend
} from 'recharts';
import { api } from '../services/api';
import { KpiCard } from '../components/KpiCard';
import { StatusBadge } from '../components/Badge';
import { useToast } from '../components/Toast';

const STATUS_COLORS: Record<string, string> = {
  Issued: '#3b82f6',
  Overdue: '#f43f5e',
  Returned: '#10b981',
  Damaged: '#f59e0b',
  Lost: '#64748b',
};

const PIE_PALETTE = ['#4f46e5', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#ec4899'];

export const DashboardPage: React.FC<{ onNavigate: (tab: any) => void }> = ({ onNavigate }) => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { error } = useToast();

  const fetchDashboard = async () => {
    try {
      setIsLoading(true);
      const res = await api.getDashboardSummary();
      setData(res);
    } catch (err: any) {
      error(err.message || 'Failed to load dashboard analytics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (isLoading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
        <p className="text-sm text-slate-500">Aggregating live library database metrics...</p>
      </div>
    );
  }

  const kpis = data?.kpis || {};

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Library Executive Dashboard</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time circulation metrics, inventory availability, and borrower statistics.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchDashboard}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Sync Live DB</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Catalog Titles"
          value={kpis.total_titles ?? 0}
          subtitle="Distinct books in catalog"
          icon={BookOpen}
          color="indigo"
        />
        <KpiCard
          title="Copies Available"
          value={kpis.total_copies ?? 0}
          subtitle="Ready for physical issue"
          icon={Copy}
          color="sky"
        />
        <KpiCard
          title="Registered Students"
          value={kpis.total_students ?? 0}
          subtitle={`${kpis.ug_students ?? 0} UG (Limit 3) • ${kpis.pg_students ?? 0} PG (Limit 6)`}
          icon={Users}
          color="purple"
        />
        <KpiCard
          title="Active Issued"
          value={kpis.active_issued ?? 0}
          subtitle="Books currently in circulation"
          icon={ArrowLeftRight}
          color="emerald"
        />
        <KpiCard
          title="Overdue Records"
          value={kpis.overdue_count ?? 0}
          subtitle="Past scheduled due date"
          icon={AlertCircle}
          color="rose"
        />
        <KpiCard
          title="Active Reservations"
          value={kpis.total_reservations ?? 0}
          subtitle="Student queue requests"
          icon={BookmarkCheck}
          color="amber"
        />
        <KpiCard
          title="Outstanding Fines"
          value={`$${Number(kpis.unpaid_fines_total || 0).toFixed(2)}`}
          subtitle={`Paid: $${Number(kpis.paid_fines_total || 0).toFixed(2)}`}
          icon={DollarSign}
          color="rose"
        />
        <KpiCard
          title="Library Staff"
          value={kpis.total_admins ?? 0}
          subtitle="Authorized staff administrators"
          icon={ShieldCheck}
          color="indigo"
        />
      </div>

      {/* Analytics Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Breakdown */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Book Distribution by Category</h2>
              <p className="text-xs text-slate-500">Inventory volume across 3NF academic categories</p>
            </div>
            <button
              onClick={() => onNavigate('books')}
              className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1"
            >
              <span>Catalog</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.category_distribution || []} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="category_name"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickFormatter={(val) => val.split(' ')[0]}
                />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="book_count" name="Titles" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                <Bar dataKey="total_copies" name="Total Copies" fill="#93c5fd" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Distribution */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Lending Status Breakdown</h2>
            <p className="text-xs text-slate-500">Live proportion of circulation transactions</p>
          </div>
          <div className="h-56 relative my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data?.status_distribution?.filter((s: any) => s.value > 0) || []}
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {data?.status_distribution?.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || PIE_PALETTE[index % PIE_PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100">
            {data?.status_distribution?.map((item: any, idx: number) => (
              <div key={idx} className="flex items-center gap-1.5 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[item.name] || '#94a3b8' }}></span>
                <span>{item.name}:</span>
                <span className="font-semibold text-slate-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Lending Timeline Chart */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Circulation Activity Timeline</h2>
            <p className="text-xs text-slate-500">Issuing volume recorded chronologically</p>
          </div>
          <button
            onClick={() => onNavigate('lending')}
            className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1"
          >
            <span>View All Records</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data?.lending_timeline || []} margin={{ top: 10, right: 20, left: -20, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
              />
              <Line type="monotone" dataKey="count" name="Issues" stroke="#4f46e5" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3 Detail Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recently Issued */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4 text-indigo-600" />
                Recently Issued Books
              </h3>
              <button
                onClick={() => onNavigate('lending')}
                className="text-xs text-indigo-600 font-medium hover:underline"
              >
                More
              </button>
            </div>
            <div className="divide-y divide-slate-100 mt-2">
              {data?.recent_issued?.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">No recent lending transactions.</p>
              ) : (
                data?.recent_issued?.map((item: any) => (
                  <div key={item.lending_id} className="py-2.5 flex items-center justify-between">
                    <div className="min-w-0 pr-2">
                      <div className="text-xs font-semibold text-slate-900 truncate">{item.book_title}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{item.student_name} • Issued {item.issue_date}</div>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Overdue / Due Soon */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-rose-600" />
                Due Dates & Attention
              </h3>
              <button
                onClick={() => onNavigate('lending')}
                className="text-xs text-rose-600 font-medium hover:underline"
              >
                Overdue
              </button>
            </div>
            <div className="divide-y divide-slate-100 mt-2">
              {data?.overdue_items?.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">No items currently overdue.</p>
              ) : (
                data?.overdue_items?.map((item: any) => (
                  <div key={item.lending_id} className="py-2.5 flex items-center justify-between">
                    <div className="min-w-0 pr-2">
                      <div className="text-xs font-semibold text-slate-900 truncate">{item.book_title}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{item.student_name} • Due: {item.due_date}</div>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Recent Reservations */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <BookmarkCheck className="w-4 h-4 text-amber-600" />
                Active Reservations
              </h3>
              <button
                onClick={() => onNavigate('reservations')}
                className="text-xs text-amber-600 font-medium hover:underline"
              >
                Queue
              </button>
            </div>
            <div className="divide-y divide-slate-100 mt-2">
              {data?.recent_reservations?.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">No active reservations in queue.</p>
              ) : (
                data?.recent_reservations?.map((item: any, idx: number) => (
                  <div key={idx} className="py-2.5 flex items-center justify-between">
                    <div className="min-w-0 pr-2">
                      <div className="text-xs font-semibold text-slate-900 truncate">{item.book_title}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{item.student_name}</div>
                    </div>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                      {item.copies_available} left
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
