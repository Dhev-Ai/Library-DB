import React from 'react';
import {
  LayoutDashboard,
  BookOpen,
  Tags,
  Users,
  GraduationCap,
  Award,
  ShieldCheck,
  ArrowLeftRight,
  BookmarkCheck,
  DollarSign,
  BarChart3,
  Database,
  Settings,
  LogOut,
  Library,
  ChevronRight,
  X
} from 'lucide-react';

export type NavItemKey =
  | 'dashboard'
  | 'books'
  | 'categories'
  | 'students'
  | 'undergraduate'
  | 'postgraduate'
  | 'staff'
  | 'lending'
  | 'reservations'
  | 'fines'
  | 'reports'
  | 'database-explorer'
  | 'settings';

interface SidebarProps {
  currentTab: NavItemKey;
  onSelectTab: (tab: NavItemKey) => void;
  onLogout: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  onLogout,
  isOpenMobile,
  onCloseMobile,
}) => {
  const navSections = [
    {
      title: 'Overview',
      items: [
        { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      ],
    },
    {
      title: 'Catalog & Inventory',
      items: [
        { key: 'books', label: 'Books & Catalog', icon: BookOpen },
        { key: 'categories', label: 'Categories', icon: Tags },
      ],
    },
    {
      title: 'Borrowers & Members',
      items: [
        { key: 'students', label: 'All Students', icon: Users },
        { key: 'undergraduate', label: 'Undergraduate (Limit 3)', icon: GraduationCap },
        { key: 'postgraduate', label: 'Postgraduate (Limit 6)', icon: Award },
        { key: 'staff', label: 'Library Staff', icon: ShieldCheck },
      ],
    },
    {
      title: 'Circulation & Operations',
      items: [
        { key: 'lending', label: 'Lending & Returns', icon: ArrowLeftRight },
        { key: 'reservations', label: 'Reservations', icon: BookmarkCheck },
        { key: 'fines', label: 'Fines & Payments', icon: DollarSign },
      ],
    },
    {
      title: 'Analytics & Schema',
      items: [
        { key: 'reports', label: 'Reports & Audits', icon: BarChart3 },
        { key: 'database-explorer', label: 'Database Explorer', icon: Database, badge: 'Faculty' },
        { key: 'settings', label: 'Settings', icon: Settings },
      ],
    },
  ];

  const handleNavClick = (key: NavItemKey) => {
    onSelectTab(key);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Persistent Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-72 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand header */}
        <div className="h-18 flex items-center justify-between px-6 border-b border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-linear-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25">
              <Library className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-white text-base tracking-tight leading-none">University Library</div>
              <div className="text-[11px] text-indigo-400 mt-1 font-mono tracking-wider">DBMS LENDING SYS</div>
            </div>
          </div>
          <button
            onClick={onCloseMobile}
            className="lg:hidden text-slate-400 hover:text-white p-1.5 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation items */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
          {navSections.map((sec, idx) => (
            <div key={idx} className="space-y-1">
              <div className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
                {sec.title}
              </div>
              {sec.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => handleNavClick(item.key as NavItemKey)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 px-1.5 py-0.5 rounded-md">
                        {item.badge}
                      </span>
                    )}
                    {isActive && !item.badge && <ChevronRight className="w-4 h-4 text-white/70" />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer Admin & Logout */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};
