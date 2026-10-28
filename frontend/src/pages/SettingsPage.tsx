import React, { useEffect, useState } from 'react';
import { Database, Shield, DollarSign, KeyRound, CheckCircle2, Save } from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../components/Toast';
import type { HealthInfo, AuthUser } from '../types';

export const SettingsPage: React.FC<{ user: AuthUser | null }> = ({ user }) => {
  const [health, setHealth] = useState<HealthInfo | null>(null);
  const [overdueRate, setOverdueRate] = useState<number>(1.50);
  const [currencySymbol, setCurrencySymbol] = useState<string>('$');
  const [isSavingPolicy, setIsSavingPolicy] = useState(false);

  const { success, error } = useToast();

  const fetchHealth = async () => {
    try {
      const res = await api.getHealth();
      setHealth(res);
    } catch (err: any) {
      console.error(err);
    }
  };

  const fetchPolicy = async () => {
    try {
      const res = await api.getPolicy();
      setOverdueRate(res.daily_overdue_rate);
      setCurrencySymbol(res.currency_symbol);
    } catch (err: any) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchHealth();
    fetchPolicy();
  }, []);

  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingPolicy(true);
      await api.updatePolicy({
        daily_overdue_rate: Number(overdueRate),
        currency_symbol: currencySymbol.trim(),
      });
      success(`Circulation fine rate updated to ${currencySymbol}${overdueRate}/day`);
    } catch (err: any) {
      error(err.message || 'Failed to update policy');
    } finally {
      setIsSavingPolicy(false);
    }
  };

  const isMysql = health?.database_engine === 'mysql';

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">System & Database Settings</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Engine configuration, configurable fine policies, and administrator credentials.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Database Connection Info Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Database className="w-5 h-5 text-indigo-600" />
              Database Engine Status
            </h2>
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                isMysql
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-indigo-50 text-indigo-800 border border-indigo-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              {isMysql ? 'Live MySQL 8.0' : 'Database Ready (Fallback Engine)'}
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Database Name:</span>
              <span className="font-mono font-bold text-slate-900">{health?.database_name || 'library_lending_db'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Active Engine:</span>
              <span className="font-mono font-bold text-slate-900 uppercase">{health?.database_engine}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Host & Port:</span>
              <span className="font-mono text-slate-900">{health?.host}:{health?.port}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Schema Standard:</span>
              <span className="font-semibold text-slate-900">3NF Normalized (17 Relational Entities)</span>
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-indigo-600" />
              Dual-Engine Database Architecture
            </div>
            <p>
              The backend connects directly to MySQL 8.0 on localhost:3306 using credentials configured in <code className="bg-slate-200 px-1 py-0.5 rounded font-mono">backend/.env</code>.
            </p>
          </div>
        </div>

        {/* Dynamic Fine Policy Configuration Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              Circulation & Fine Policy
            </h2>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              Configurable
            </span>
          </div>

          <form onSubmit={handleSavePolicy} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Daily Overdue Rate *
                </label>
                <input
                  type="number"
                  step="0.10"
                  min="0.10"
                  required
                  value={overdueRate}
                  onChange={(e) => setOverdueRate(parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Currency Symbol *
                </label>
                <input
                  type="text"
                  maxLength={5}
                  required
                  value={currencySymbol}
                  onChange={(e) => setCurrencySymbol(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="space-y-2 text-xs pt-2 border-t border-slate-100">
              <div className="flex justify-between text-slate-600">
                <span>Undergraduate Borrow Limit:</span>
                <span className="font-bold text-indigo-700">3 books max simultaneously (CHECK rule)</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Postgraduate Borrow Limit:</span>
                <span className="font-bold text-purple-700">6 books max simultaneously (CHECK rule)</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Reference Books Policy:</span>
                <span className="font-bold text-amber-700">Non-lendable in-library reading only</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSavingPolicy}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs transition disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSavingPolicy ? 'Saving Policy...' : 'Save & Update Circulation Policy'}</span>
            </button>
          </form>
        </div>

        {/* Authenticated Staff Administrator Profile */}
        {user && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4 md:col-span-2">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-600" />
                Active Session Administrator
              </h2>
              <span className="text-xs text-emerald-600 flex items-center gap-1 font-semibold">
                <KeyRound className="w-3.5 h-3.5" />
                JWT Bearer Authenticated
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-500">Name:</span>
                <div className="font-bold text-slate-900 text-sm mt-0.5">{user.name}</div>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-500">Username:</span>
                <div className="font-mono font-bold text-indigo-600 text-sm mt-0.5">@{user.username}</div>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-500">Staff Admin ID:</span>
                <div className="font-mono font-bold text-slate-900 text-sm mt-0.5">#{user.admin_id}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
