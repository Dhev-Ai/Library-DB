import React, { useEffect, useState } from 'react';
import { Tags, Plus, Edit2, Trash2, BookOpen, RefreshCw } from 'lucide-react';
import { api } from '../services/api';
import { Modal } from '../components/Modal';
import { ConfirmModal } from '../components/ConfirmModal';
import { useToast } from '../components/Toast';
import type { Category } from '../types';

export const CategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

  const { success, error } = useToast();

  const fetchCategories = async () => {
    try {
      setIsLoading(true);
      const data = await api.getCategories();
      setCategories(data);
    } catch (err: any) {
      error('Failed to load categories');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleOpenAdd = () => {
    setEditingCategory(null);
    setCategoryName('');
    setIsAddEditOpen(true);
  };

  const handleOpenEdit = (c: Category) => {
    setEditingCategory(c);
    setCategoryName(c.category_name);
    setIsAddEditOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim()) return;

    try {
      if (editingCategory) {
        await api.updateCategory(editingCategory.category_id, { category_name: categoryName.trim() });
        success('Category updated successfully');
      } else {
        await api.createCategory({ category_name: categoryName.trim() });
        success('New category registered (3NF decomposition)');
      }
      setIsAddEditOpen(false);
      fetchCategories();
    } catch (err: any) {
      error(err.message || 'Operation failed');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.deleteCategory(deleteTarget.category_id);
      success(`Category "${deleteTarget.category_name}" removed`);
      setDeleteTarget(null);
      fetchCategories();
    } catch (err: any) {
      error(err.message || 'Could not delete category');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Academic Categories (3NF)</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Normalized category entities removing transitive dependencies from the catalog table.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs shadow-indigo-600/20 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Category</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading && categories.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
            Loading academic categories...
          </div>
        ) : categories.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400">
            <Tags className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            No categories registered yet.
          </div>
        ) : (
          categories.map((c) => (
            <div
              key={c.category_id}
              className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-xs text-slate-400">CAT #{c.category_id}</span>
                  <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>{c.book_count} books</span>
                  </div>
                </div>
                <h3 className="font-bold text-slate-900 text-base">{c.category_name}</h3>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-slate-100">
                <button
                  onClick={() => handleOpenEdit(c)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition"
                  title="Rename category"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeleteTarget(c)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                  title="Delete category"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add / Edit Category Modal */}
      <Modal
        isOpen={isAddEditOpen}
        onClose={() => setIsAddEditOpen(false)}
        title={editingCategory ? `Rename Category #${editingCategory.category_id}` : 'Create Academic Category'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Category Name *
            </label>
            <input
              type="text"
              required
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              placeholder="e.g. Artificial Intelligence & Data Science"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
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
              Save Category
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Academic Category"
        message={`Are you sure you want to delete "${deleteTarget?.category_name}"? If any books are attached, MySQL will enforce the ON DELETE RESTRICT foreign key constraint.`}
        confirmText="Delete Category"
        variant="danger"
      />
    </div>
  );
};
