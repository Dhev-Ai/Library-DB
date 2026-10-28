import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  Download,
  Save,
  Printer,
  RefreshCw,
  Calendar,
  AlertTriangle,
  BookOpen,
  DollarSign,
  Layers,
  History,
  CheckCircle2
} from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../components/Toast';
import type { SavedReport } from '../types';

export const ReportsPage: React.FC = () => {
  const [activeReport, setActiveReport] = useState<
    'circulation' | 'overdue' | 'damage' | 'popular' | 'fines' | 'categories'
  >('circulation');
  const [reportData, setReportData] = useState<any>(null);
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const { success, error } = useToast();

  const fetchReport = async () => {
    try {
      setIsLoading(true);
      let data: any = null;
      if (activeReport === 'circulation') data = await api.getCirculationSummary();
      else if (activeReport === 'overdue') data = await api.getOverdueDefaulters();
      else if (activeReport === 'damage') data = await api.getDamageLost();
      else if (activeReport === 'popular') data = await api.getPopularBooks();
      else if (activeReport === 'fines') data = await api.getFineCollections();
      else if (activeReport === 'categories') data = await api.getCategoryStatistics();
      setReportData(data);
    } catch (err: any) {
      error(err.message || 'Failed to generate report');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSavedReports = async () => {
    try {
      const res = await api.getSavedReports();
      setSavedReports(res);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [activeReport]);

  useEffect(() => {
    fetchSavedReports();
  }, []);

  const handleSaveReportMetadata = async () => {
    const reportNames: Record<string, string> = {
      circulation: 'Monthly Circulation Audit Summary',
      overdue: 'Overdue Borrowers & Defaulters Audit',
      damage: 'Damaged & Lost Inventory Report',
      popular: 'High Demand Catalog & Backlog Report',
      fines: 'Fine Revenue & Outstanding Audit',
      categories: '3NF Category Inventory Distribution',
    };
    try {
      setIsSaving(true);
      await api.saveReport(reportNames[activeReport]);
      success(`Report metadata recorded into REPORT table`);
      fetchSavedReports();
    } catch (err: any) {
      error(err.message || 'Failed to save report metadata');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportCSV = () => {
    if (!reportData) return;
    let rows: any[] = [];
    if (activeReport === 'circulation') rows = reportData.monthly_data || [];
    else if (activeReport === 'overdue') rows = reportData.defaulters || [];
    else if (activeReport === 'damage') rows = reportData.damage_records || [];
    else if (activeReport === 'popular') rows = reportData.popular_books || [];
    else if (activeReport === 'fines') rows = reportData.collections || [];
    else if (activeReport === 'categories') rows = reportData.category_statistics || [];

    if (rows.length === 0) {
      error('No data available to export');
      return;
    }

    const headers = Object.keys(rows[0]).join(',');
    const csvContent = [
      headers,
      ...rows.map((r) =>
        Object.values(r)
          .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
          .join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${activeReport}_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    success('Report data exported to CSV');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">System Reports & Audit Analytics</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Generate dynamic SQL aggregated reports and persist generation audit trails into the REPORT table.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs transition"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handleSaveReportMetadata}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs shadow-indigo-600/20 transition disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Logging...' : 'Save Report Log'}</span>
          </button>
        </div>
      </div>

      {/* Report Selection Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {[
          { key: 'circulation', label: 'Monthly Circulation', icon: Calendar },
          { key: 'overdue', label: 'Overdue & Defaulters', icon: AlertTriangle },
          { key: 'damage', label: 'Damage & Lost Inventory', icon: Layers },
          { key: 'popular', label: 'High Demand Books', icon: BookOpen },
          { key: 'fines', label: 'Fine Revenue Collections', icon: DollarSign },
          { key: 'categories', label: 'Category Inventory Statistics', icon: BarChart3 },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeReport === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveReport(tab.key as any)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                isActive
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Dynamic Report Content */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden p-6">
        {isLoading ? (
          <div className="py-16 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-indigo-500" />
            Executing dynamic analytical queries...
          </div>
        ) : (
          <div>
            {activeReport === 'circulation' && (
              <div className="space-y-4">
                <h3 className="font-bold text-slate-900 text-base">Monthly Circulation Summary</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase">
                      <tr>
                        <th className="px-4 py-3">Month</th>
                        <th className="px-4 py-3">Total Issues</th>
                        <th className="px-4 py-3">Returned</th>
                        <th className="px-4 py-3">Overdue</th>
                        <th className="px-4 py-3">Damaged</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reportData?.monthly_data?.map((m: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50 font-mono text-xs">
                          <td className="px-4 py-3 font-semibold text-slate-900">{m.month}</td>
                          <td className="px-4 py-3 font-bold text-indigo-600">{m.total_issued}</td>
                          <td className="px-4 py-3 text-emerald-600">{m.returned_count}</td>
                          <td className="px-4 py-3 text-rose-600">{m.overdue_count}</td>
                          <td className="px-4 py-3 text-amber-600">{m.damaged_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeReport === 'overdue' && (
              <div className="space-y-4">
                <h3 className="font-bold text-slate-900 text-base">Overdue Defaulters Audit</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase">
                      <tr>
                        <th className="px-4 py-3">Student Name</th>
                        <th className="px-4 py-3">Book Title</th>
                        <th className="px-4 py-3">Due Date</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Fine Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {reportData?.defaulters?.map((d: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-semibold text-slate-900">{d.student_name}</td>
                          <td className="px-4 py-3">{d.book_title}</td>
                          <td className="px-4 py-3 font-mono text-rose-600 font-semibold">{d.due_date}</td>
                          <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-bold border border-rose-200">Overdue</span></td>
                          <td className="px-4 py-3 font-bold text-slate-900 font-mono">${d.fine_amount?.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeReport === 'damage' && (
              <div className="space-y-4">
                <h3 className="font-bold text-slate-900 text-base">Damaged & Lost Inventory Report</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase">
                      <tr>
                        <th className="px-4 py-3">Book Title</th>
                        <th className="px-4 py-3">Borrower</th>
                        <th className="px-4 py-3">Condition Assessment</th>
                        <th className="px-4 py-3">Fine Assessed</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {reportData?.damage_records?.map((dr: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-semibold text-slate-900">{dr.book_title}</td>
                          <td className="px-4 py-3">{dr.student_name}</td>
                          <td className="px-4 py-3 text-amber-800 italic">{dr.damage_note || 'Lost item'}</td>
                          <td className="px-4 py-3 font-mono font-bold text-slate-900">${dr.fine_amount?.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeReport === 'popular' && (
              <div className="space-y-4">
                <h3 className="font-bold text-slate-900 text-base">High Demand Books & Backlog</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase">
                      <tr>
                        <th className="px-4 py-3">Title</th>
                        <th className="px-4 py-3">Category</th>
                        <th className="px-4 py-3">Total Borrows</th>
                        <th className="px-4 py-3">Active Reservations</th>
                        <th className="px-4 py-3">Current Stock</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {reportData?.popular_books?.map((pb: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-semibold text-slate-900">{pb.title}</td>
                          <td className="px-4 py-3">{pb.category_name}</td>
                          <td className="px-4 py-3 font-bold text-indigo-600 font-mono">{pb.total_borrows}</td>
                          <td className="px-4 py-3 font-bold text-amber-600 font-mono">{pb.active_reservations}</td>
                          <td className="px-4 py-3 font-mono">{pb.copies_available} left</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeReport === 'fines' && (
              <div className="space-y-4">
                <h3 className="font-bold text-slate-900 text-base">Fine Payment Collections</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {reportData?.collections?.map((col: any, idx: number) => (
                    <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="text-xs uppercase text-slate-500 font-semibold">{col.paid_status} Status</div>
                      <div className="text-2xl font-bold font-mono text-slate-900 mt-2">${col.total_amount?.toFixed(2)}</div>
                      <div className="text-xs text-slate-500 mt-1">{col.count} fine record(s)</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeReport === 'categories' && (
              <div className="space-y-4">
                <h3 className="font-bold text-slate-900 text-base">Category Inventory Statistics</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase">
                      <tr>
                        <th className="px-4 py-3">Category Name</th>
                        <th className="px-4 py-3">Total Titles</th>
                        <th className="px-4 py-3">Total Physical Copies</th>
                        <th className="px-4 py-3">Lifetime Lending Events</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {reportData?.category_statistics?.map((cs: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-semibold text-slate-900">{cs.category_name}</td>
                          <td className="px-4 py-3 font-mono font-bold text-indigo-600">{cs.title_count}</td>
                          <td className="px-4 py-3 font-mono">{cs.total_copies}</td>
                          <td className="px-4 py-3 font-mono font-bold text-slate-900">{cs.total_lending_events}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Saved Reports Audit Trail (Table 7: REPORT) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
        <h3 className="font-bold text-slate-900 text-base flex items-center gap-2 mb-4">
          <History className="w-4 h-4 text-indigo-600" />
          Audit Log of Generated Reports (REPORT Table)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-3">Report ID</th>
                <th className="px-4 py-3">Report Type Description</th>
                <th className="px-4 py-3">Generated Timestamp</th>
                <th className="px-4 py-3">Authorized Administrator</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {savedReports.map((sr) => (
                <tr key={sr.report_id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-slate-400 font-bold">#{sr.report_id}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">{sr.report_type}</td>
                  <td className="px-4 py-3 font-mono text-slate-500">{sr.generated_date}</td>
                  <td className="px-4 py-3 font-medium text-indigo-600">{sr.admin_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
