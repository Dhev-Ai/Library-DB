import React, { useState, useEffect } from 'react';
import { ToastProvider, useToast } from './components/Toast';
import { Sidebar, type NavItemKey } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { CommandPalette } from './components/CommandPalette';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { BooksPage } from './pages/BooksPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { StudentsPage } from './pages/StudentsPage';
import { StaffPage } from './pages/StaffPage';
import { LendingPage } from './pages/LendingPage';
import { ReservationsPage } from './pages/ReservationsPage';
import { FinesPage } from './pages/FinesPage';
import { ReportsPage } from './pages/ReportsPage';
import { DatabaseExplorerPage } from './pages/DatabaseExplorerPage';
import { SettingsPage } from './pages/SettingsPage';
import { StudentPortalPage } from './pages/StudentPortalPage';
import { api, getToken, removeToken } from './services/api';
import type { AuthUser, HealthInfo } from './types';

const MainApp: React.FC = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [health, setHealth] = useState<HealthInfo | null>(null);
  const [currentTab, setCurrentTab] = useState<NavItemKey>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isQuickIssueOpen, setIsQuickIssueOpen] = useState(false);
  const [preSelectedBookId, setPreSelectedBookId] = useState<number | null>(null);
  const [preSelectedStudentId, setPreSelectedStudentId] = useState<number | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  const { success } = useToast();

  const handleIssueForBook = (bookId: number) => {
    setPreSelectedBookId(bookId);
    setPreSelectedStudentId(null);
    setCurrentTab('lending');
    setIsQuickIssueOpen(true);
  };

  const handleIssueForStudent = (studentId: number) => {
    setPreSelectedStudentId(studentId);
    setPreSelectedBookId(null);
    setCurrentTab('lending');
    setIsQuickIssueOpen(true);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    // Check existing stored auth
    const token = getToken();
    const storedUser = localStorage.getItem('auth_user');
    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        removeToken();
      }
    }
    setAuthLoading(false);

    // Fetch database engine health
    api
      .getHealth()
      .then((h) => setHealth(h))
      .catch((err) => console.error(err));
  }, []);

  const handleLogout = () => {
    removeToken();
    setUser(null);
    success('Logged out successfully');
  };

  const handleQuickIssue = () => {
    setCurrentTab('lending');
    setIsQuickIssueOpen(true);
  };

  const handleQuickAddBook = () => {
    setCurrentTab('books');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        Loading Library Management System...
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLoginSuccess={(u) => setUser(u)} />;
  }

  if (user.role === 'student') {
    return <StudentPortalPage user={user} onLogout={handleLogout} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Persistent Left Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          if (tab !== 'lending') setIsQuickIssueOpen(false);
        }}
        onLogout={handleLogout}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-72 flex flex-col min-w-0">
        <Navbar
          user={user}
          health={health}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          onQuickIssue={handleQuickIssue}
          onQuickAddBook={handleQuickAddBook}
          onOpenSearch={() => setIsSearchOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {currentTab === 'dashboard' && <DashboardPage onNavigate={(tab) => setCurrentTab(tab)} />}
          {currentTab === 'books' && <BooksPage onQuickIssueBook={handleIssueForBook} />}
          {currentTab === 'categories' && <CategoriesPage />}
          {currentTab === 'students' && <StudentsPage onQuickIssueStudent={handleIssueForStudent} />}
          {currentTab === 'undergraduate' && (
            <StudentsPage
              filterType="undergraduate"
              title="Undergraduate Student Borrowers"
              subtitle="Enforces undergraduate borrowing limit of 3 simultaneously issued books."
              onQuickIssueStudent={handleIssueForStudent}
            />
          )}
          {currentTab === 'postgraduate' && (
            <StudentsPage
              filterType="postgraduate"
              title="Postgraduate Student Borrowers"
              subtitle="Enforces postgraduate borrowing limit of 6 books and tracks academic research focus area."
              onQuickIssueStudent={handleIssueForStudent}
            />
          )}
          {currentTab === 'staff' && <StaffPage />}
          {currentTab === 'lending' && (
            <LendingPage
              initialIssueOpen={isQuickIssueOpen}
              preSelectedBookId={preSelectedBookId}
              preSelectedStudentId={preSelectedStudentId}
              onResetIssueModal={() => {
                setIsQuickIssueOpen(false);
                setPreSelectedBookId(null);
                setPreSelectedStudentId(null);
              }}
            />
          )}
          {currentTab === 'reservations' && <ReservationsPage />}
          {currentTab === 'fines' && <FinesPage />}
          {currentTab === 'reports' && <ReportsPage />}
          {currentTab === 'database-explorer' && <DatabaseExplorerPage />}
          {currentTab === 'settings' && <SettingsPage user={user} />}
        </main>
      </div>

      {/* Global Quick Search Overlay */}
      <CommandPalette
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onNavigate={(tab) => setCurrentTab(tab)}
      />
    </div>
  );
};

export default function App() {
  return (
    <ToastProvider>
      <MainApp />
    </ToastProvider>
  );
}
