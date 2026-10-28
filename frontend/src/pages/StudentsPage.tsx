import React, { useEffect, useState, useCallback } from 'react';
import {
  Users,
  Search,
  Plus,
  Edit2,
  Trash2,
  Eye,
  RefreshCw,
  Phone,
  GraduationCap,
  Award,
  BookOpen,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  X
} from 'lucide-react';
import { api } from '../services/api';
import { Modal } from '../components/Modal';
import { ConfirmModal } from '../components/ConfirmModal';
import { StatusBadge } from '../components/Badge';
import { useToast } from '../components/Toast';
import type { Student } from '../types';

interface StudentsPageProps {
  filterType?: 'undergraduate' | 'postgraduate';
  title?: string;
  subtitle?: string;
  onQuickIssueStudent?: (studentId: number) => void;
}

export const StudentsPage: React.FC<StudentsPageProps> = ({
  filterType,
  title = 'Student Directory Management',
  subtitle = 'EER Superclass/Subclass Person-Student model with borrowing limit enforcement.',
  onQuickIssueStudent,
}) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Modals
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailedStudent, setDetailedStudent] = useState<any | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    department: 'Computer Science & Engineering',
    join_year: 2024,
    student_type: (filterType || 'undergraduate') as 'undergraduate' | 'postgraduate',
    research_area: '',
    phone_numbers: [''],
  });

  const { success, error } = useToast();

  const fetchStudents = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.getStudents({
        search,
        student_type: filterType || undefined,
        department: department || undefined,
        page,
        limit,
      });
      setStudents(res.items);
      setTotal(res.total);
    } catch (err: any) {
      error(err.message || 'Failed to fetch students');
    } finally {
      setIsLoading(false);
    }
  }, [search, filterType, department, page, limit]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const handleOpenAdd = () => {
    setEditingStudent(null);
    setFormData({
      name: '',
      email: '',
      department: 'Computer Science & Engineering',
      join_year: 2024,
      student_type: filterType || 'undergraduate',
      research_area: '',
      phone_numbers: [''],
    });
    setIsAddEditOpen(true);
  };

  const handleOpenEdit = (stu: Student) => {
    setEditingStudent(stu);
    const subType = stu.student_type?.toLowerCase() === 'postgraduate' ? 'postgraduate' : 'undergraduate';
    setFormData({
      name: stu.name,
      email: stu.email,
      department: stu.department,
      join_year: stu.join_year,
      student_type: subType,
      research_area: stu.research_area || '',
      phone_numbers: stu.phone_numbers?.length ? [...stu.phone_numbers] : [''],
    });
    setIsAddEditOpen(true);
  };

  const handleAddPhoneField = () => {
    setFormData({ ...formData, phone_numbers: [...formData.phone_numbers, ''] });
  };

  const handleRemovePhoneField = (index: number) => {
    setFormData({
      ...formData,
      phone_numbers: formData.phone_numbers.filter((_, i) => i !== index),
    });
  };

  const handlePhoneChange = (val: string, index: number) => {
    const updated = [...formData.phone_numbers];
    updated[index] = val;
    setFormData({ ...formData, phone_numbers: updated });
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhones = formData.phone_numbers.map((p) => p.trim()).filter(Boolean);
    try {
      if (editingStudent) {
        await api.updateStudent(editingStudent.student_id, {
          name: formData.name,
          email: formData.email,
          department: formData.department,
          join_year: formData.join_year,
          research_area: formData.student_type === 'postgraduate' ? formData.research_area : undefined,
          phone_numbers: cleanPhones,
        });
        success('Student profile updated');
      } else {
        await api.createStudent({
          ...formData,
          phone_numbers: cleanPhones,
        });
        success('New student registered into PERSON & STUDENT hierarchy');
      }
      setIsAddEditOpen(false);
      fetchStudents();
    } catch (err: any) {
      error(err.message || 'Operation failed');
    }
  };

  const handleOpenDetail = async (studentId: number) => {
    try {
      const data = await api.getStudent(studentId);
      setDetailedStudent(data);
      setIsDetailOpen(true);
    } catch (err: any) {
      error('Failed to load student complete history');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.deleteStudent(deleteTarget.student_id);
      success(`Student "${deleteTarget.name}" removed from database`);
      setDeleteTarget(null);
      fetchStudents();
    } catch (err: any) {
      error(err.message || 'Failed to delete student');
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">{subtitle}</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs shadow-indigo-600/20 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Student</span>
        </button>
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
              placeholder="Search name, email, student ID..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <select
              value={department}
              onChange={(e) => {
                setDepartment(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-700"
            >
              <option value="">All Departments</option>
              <option value="Computer Science & Engineering">Computer Science & Engineering</option>
              <option value="Artificial Intelligence & Data Science">AI & Data Science</option>
              <option value="Electronics & Communication">Electronics & Communication</option>
              <option value="Mechanical Engineering">Mechanical Engineering</option>
              <option value="Information Technology">Information Technology</option>
              <option value="Electrical & Electronics">Electrical & Electronics</option>
            </select>
          </div>

          <div className="flex items-center justify-end text-xs text-slate-500 font-medium">
            Found {total} student record(s)
          </div>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/80 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200/80">
              <tr>
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">Student Profile</th>
                <th className="px-6 py-4">Department & Year</th>
                <th className="px-6 py-4">Type & Limit</th>
                <th className="px-6 py-4">Phones (1NF)</th>
                <th className="px-6 py-4 text-center">Active Borrowed</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-normal">
              {isLoading && students.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                    Loading student records...
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    No students found matching current filters.
                  </td>
                </tr>
              ) : (
                students.map((s) => (
                  <tr key={s.student_id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs font-bold text-slate-400">#{s.student_id}</td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{s.name}</div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">{s.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs text-slate-900 font-medium">{s.department}</div>
                      <div className="text-[11px] text-slate-500">Joined {s.join_year}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <StatusBadge status={s.student_type} />
                        {s.research_area && (
                          <div className="text-[11px] text-slate-500 italic max-w-xs truncate" title={s.research_area}>
                            Area: {s.research_area}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {s.phone_numbers && s.phone_numbers.length > 0 ? (
                        <div className="space-y-1">
                          {s.phone_numbers.map((p, i) => (
                            <div key={i} className="text-xs font-mono text-slate-600 flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>{p}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">None</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                          s.active_borrows_count >= s.borrow_limit
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {s.active_borrows_count} / {s.borrow_limit} books
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenDetail(s.student_id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                          title="View profile & history"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(s)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition"
                          title="Edit student"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(s)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          title="Delete student"
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

        {/* Pagination */}
        <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing {students.length > 0 ? (page - 1) * limit + 1 : 0} to{' '}
            {Math.min(page * limit, total)} of {total} students
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

      {/* Add / Edit Student Modal */}
      <Modal
        isOpen={isAddEditOpen}
        onClose={() => setIsAddEditOpen(false)}
        title={editingStudent ? `Edit Student Profile #${editingStudent.student_id}` : 'Enroll New Student'}
        subtitle="Executes atomic multi-table insertion across PERSON, STUDENT and Subclass"
      >
        <form onSubmit={handleSaveStudent} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Aarav Sharma"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              University Email Address *
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="e.g. aarav.sharma@vitstudent.ac.in"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Department *
              </label>
              <input
                type="text"
                required
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                placeholder="e.g. Computer Science"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Joining Year *
              </label>
              <input
                type="number"
                min="1990"
                max="2030"
                required
                value={formData.join_year}
                onChange={(e) => setFormData({ ...formData, join_year: parseInt(e.target.value) || 2024 })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Subclass Selection */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Student Classification Level *
              </label>
              <select
                value={formData.student_type}
                onChange={(e: any) => setFormData({ ...formData, student_type: e.target.value })}
                disabled={!!editingStudent}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-900"
              >
                <option value="undergraduate">Undergraduate (Borrow Limit = 3 books)</option>
                <option value="postgraduate">Postgraduate (Borrow Limit = 6 books)</option>
              </select>
            </div>

            {formData.student_type === 'postgraduate' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Master's / Ph.D. Research Area *
                </label>
                <input
                  type="text"
                  required
                  value={formData.research_area}
                  onChange={(e) => setFormData({ ...formData, research_area: e.target.value })}
                  placeholder="e.g. Distributed Systems & Cloud Computing"
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                />
              </div>
            )}
          </div>

          {/* Phone Numbers (1NF Decomposition) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Contact Numbers (PERSON_PHONE 1NF)
              </label>
              <button
                type="button"
                onClick={handleAddPhoneField}
                className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Add Number</span>
              </button>
            </div>
            <div className="space-y-2">
              {formData.phone_numbers.map((ph, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={ph}
                    onChange={(e) => handlePhoneChange(e.target.value, idx)}
                    placeholder="e.g. +91-9840112345"
                    className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                  />
                  {formData.phone_numbers.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemovePhoneField(idx)}
                      className="p-1.5 text-slate-400 hover:text-rose-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
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
              {editingStudent ? 'Save Profile' : 'Register Student'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Student Profile & History Modal */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={detailedStudent?.name || 'Student Profile'}
        subtitle={`Student ID #${detailedStudent?.student_id} • ${detailedStudent?.student_type}`}
        maxWidth="xl"
      >
        {detailedStudent && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200/80">
              <div>
                <span className="text-slate-500">Email:</span>
                <div className="font-mono font-semibold text-slate-900 mt-0.5">{detailedStudent.email}</div>
              </div>
              <div>
                <span className="text-slate-500">Department:</span>
                <div className="font-semibold text-slate-900 mt-0.5">{detailedStudent.department}</div>
              </div>
              <div>
                <span className="text-slate-500">Borrow Limit:</span>
                <div className="font-bold text-indigo-700 mt-0.5">{detailedStudent.borrow_limit} books simultaneously</div>
              </div>
              <div>
                <span className="text-slate-500">Join Year:</span>
                <div className="font-semibold text-slate-900 mt-0.5">{detailedStudent.join_year}</div>
              </div>
              {detailedStudent.research_area && (
                <div className="col-span-2">
                  <span className="text-slate-500">Research Focus:</span>
                  <div className="font-medium text-slate-900 mt-0.5">{detailedStudent.research_area}</div>
                </div>
              )}
            </div>

            {/* Current Active Borrows */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-indigo-600" />
                  Active Borrowed Books ({detailedStudent.active_borrows?.length || 0} / {detailedStudent.borrow_limit})
                </h4>
                {onQuickIssueStudent && detailedStudent.active_borrows?.length < detailedStudent.borrow_limit && (
                  <button
                    onClick={() => {
                      setIsDetailOpen(false);
                      onQuickIssueStudent(detailedStudent.student_id);
                    }}
                    className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition"
                  >
                    + Issue Book to this Student
                  </button>
                )}
              </div>
              {detailedStudent.active_borrows?.length === 0 ? (
                <p className="text-xs text-slate-400 bg-slate-50 p-3 rounded-lg text-center">
                  No active books currently borrowed.
                </p>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                  {detailedStudent.active_borrows?.map((b: any) => (
                    <div key={b.lending_id} className="p-3 text-xs flex items-center justify-between bg-white">
                      <div>
                        <div className="font-semibold text-slate-900">{b.book_title}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Issued: {b.issue_date} • Due: {b.due_date}
                        </div>
                      </div>
                      <StatusBadge status={b.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Circulation History */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                All Circulation Records ({detailedStudent.lending_records?.length || 0})
              </h4>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden max-h-40 overflow-y-auto">
                {detailedStudent.lending_records?.map((rec: any) => (
                  <div key={rec.lending_id} className="p-3 text-xs flex items-center justify-between bg-white">
                    <div>
                      <div className="font-semibold text-slate-900">{rec.book_title}</div>
                      <div className="text-[11px] text-slate-500">
                        {rec.issue_date} to {rec.return_date || 'Current'}
                      </div>
                    </div>
                    <StatusBadge status={rec.status} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Student Record"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? The database will cascade deletion to their phone numbers and subclass records, but will reject if active lending records reference this student.`}
        confirmText="Delete Student"
        variant="danger"
      />
    </div>
  );
};
