import React from 'react';
import { Menu, Database, Shield, BookOpen, PlusCircle, Search } from 'lucide-react';
import type { AuthUser, HealthInfo } from '../types';

interface NavbarProps {
  user: AuthUser | null;
  health: HealthInfo | null;
  onOpenMobileSidebar: () => void;
  onQuickIssue: () => void;
  onQuickAddBook: () => void;
  onOpenSearch?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  health,
  onOpenMobileSidebar,
  onQuickIssue,
  onQuickAddBook,
  onOpenSearch,
}) => {
  const isMysql = health?.database_engine === 'mysql';

  return (
    <header className="sticky top-0 z-30 h-18 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <button
          onClick={onOpenMobileSidebar}
          className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Database Status Pill */}
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border shadow-2xs ${
              isMysql
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-indigo-50 text-indigo-800 border-indigo-200'
            }`}
          >
            <Database className={`w-3.5 h-3.5 ${isMysql ? 'text-emerald-600' : 'text-indigo-600'}`} />
            <span className="font-semibold">
              {isMysql ? 'MySQL 8.0' : 'Database Ready'}
            </span>
            <span className="text-[11px] opacity-75 hidden sm:inline">
              ({health?.database_name || 'library_lending_db'})
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>
        </div>

        {/* Global Quick Search Button */}
        {onOpenSearch && (
          <button
            onClick={onOpenSearch}
            className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-500 text-xs transition cursor-pointer border border-slate-200/60"
          >
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <span>Search library database...</span>
            <kbd className="ml-2 font-mono text-[10px] bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-400">Ctrl K</kbd>
          </button>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Quick action buttons */}
        <button
          onClick={onQuickIssue}
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs shadow-indigo-600/20 transition"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>Issue Book</span>
        </button>

        <button
          onClick={onQuickAddBook}
          className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Add Catalog</span>
        </button>

        {/* User profile capsule */}
        {user && (
          <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm shadow-xs">
              {user.name.charAt(0)}
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-xs font-semibold text-slate-900 leading-tight">{user.name}</div>
              <div className="text-[11px] text-slate-500 flex items-center gap-1">
                <Shield className="w-3 h-3 text-indigo-500" />
                <span>@{user.username}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
