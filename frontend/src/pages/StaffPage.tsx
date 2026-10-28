import React, { useEffect, useState } from 'react';
import { ShieldCheck, Plus, UserPlus, Phone, RefreshCw, KeyRound } from 'lucide-react';
import { api } from '../services/api';
import { Modal } from '../components/Modal';
import { useToast } from '../components/Toast';
import type { AuthUser } from '../types';

export const StaffPage: React.FC = () => {
  const [admins, setAdmins] = useState<AuthUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    username: '',
    password: '',
    phone: '',
  });

  const { success, error } = useToast();

  const fetchAdmins = async () => {
    try {
      setIsLoading(true);
      const data = await api.getAdmins();
      setAdmins(data);
    } catch (err: any) {
      error(err.message || 'Failed to load library staff');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createAdmin({
        name: formData.name,
        email: formData.email,
        username: formData.username,
        password: formData.password,
        phone_numbers: formData.phone ? [formData.phone] : [],
      });
      success(`Administrator @${formData.username} registered with bcrypt hash`);
      setIsAddOpen(false);
      setFormData({ name: '', email: '', username: '', password: '', phone: '' });
      fetchAdmins();
    } catch (err: any) {
      error(err.message || 'Failed to create staff administrator');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Library Staff Administration</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Authorized librarians and system administrators (PERSON & ADMIN specialization).
          </p>
        </div>
        <button
          onClick={() => setIsAddOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs shadow-indigo-600/20 transition cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Provision New Staff</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {isLoading && admins.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
            Loading staff administrators...
          </div>
        ) : (
          admins.map((adm) => (
            <div
              key={adm.admin_id}
              className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center font-bold text-sm">
                    {adm.name.charAt(0)}
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                    Librarian
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 text-base">{adm.name}</h3>
                <div className="text-xs font-mono text-indigo-600 mt-0.5">@{adm.username}</div>
                <div className="text-xs text-slate-500 mt-2">{adm.email}</div>
                {adm.phone_numbers && adm.phone_numbers.length > 0 && (
                  <div className="mt-3 text-xs text-slate-600 flex items-center gap-1.5 font-mono">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{adm.phone_numbers.join(', ')}</span>
                  </div>
                )}
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span>Staff ID: #{adm.admin_id}</span>
                <span className="flex items-center gap-1 text-emerald-600 font-medium">
                  <KeyRound className="w-3 h-3" />
                  Credentials Active
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Provision Admin Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Provision New Library Administrator"
        subtitle="Generates salt and hashes password via bcrypt before inserting into ADMIN"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Dr. Ramesh Kumar"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Official Email *
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="e.g. ramesh.kumar@vitlibrary.ac.in"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Username *
              </label>
              <input
                type="text"
                required
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="e.g. admin_ramesh"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Password *
              </label>
              <input
                type="password"
                required
                minLength={4}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Contact Phone (Optional)
            </label>
            <input
              type="text"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="e.g. +91-9841009988"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-mono"
            />
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
              Provision Account
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
