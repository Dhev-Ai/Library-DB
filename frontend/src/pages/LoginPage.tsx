import React, { useState } from 'react';
import { Library, Shield, Lock, User, ArrowRight, GraduationCap, KeyRound, CheckCircle2, AlertCircle } from 'lucide-react';
import { api, setToken } from '../services/api';
import { useToast } from '../components/Toast';
import type { AuthUser } from '../types';

interface LoginPageProps {
  onLoginSuccess: (user: AuthUser) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [role, setRole] = useState<'admin' | 'student'>('admin');
  const [isSetupMode, setIsSetupMode] = useState(false);

  // Admin login form
  const [username, setUsername] = useState('admin_rajesh');
  const [password, setPassword] = useState('Admin@123');

  // Student login form
  const [studentIdentifier, setStudentIdentifier] = useState('1'); // Aarav Sharma by default
  const [studentPassword, setStudentPassword] = useState('');

  // First-time setup form
  const [setupIdentifier, setSetupIdentifier] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const { success, error } = useToast();

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      error('Please enter both administrator username and password');
      return;
    }

    try {
      setIsLoading(true);
      const res = await api.login({ username, password });
      setToken(res.access_token);
      const userObj: AuthUser = {
        role: 'admin',
        admin_id: res.admin_id,
        username: res.username,
        name: res.name,
        email: 'admin@vitlibrary.ac.in',
      };
      localStorage.setItem('auth_user', JSON.stringify(userObj));
      success(`Welcome back, Administrator ${res.name}!`);
      onLoginSuccess(userObj);
    } catch (err: any) {
      error(err.message || 'Incorrect username or password. Access denied.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentIdentifier) {
      error('Please enter your Student ID or College Email');
      return;
    }

    try {
      setIsLoading(true);
      const res = await api.studentLogin({
        identifier: studentIdentifier,
        password: studentPassword || undefined,
      });

      // Check if student has never set a password yet
      if (res.needs_password_setup) {
        setSetupIdentifier(studentIdentifier);
        setIsSetupMode(true);
        success(`Welcome ${res.name}! First-time entry detected. Please set up your permanent password.`);
        return;
      }

      if (!res.access_token) {
        error('Authentication token not received');
        return;
      }

      setToken(res.access_token);
      const userObj: AuthUser = {
        role: 'student',
        student_id: res.student_id,
        name: res.name,
        email: res.email,
        department: res.department,
        student_type: res.student_type,
        borrow_limit: res.borrow_limit,
        join_year: res.join_year,
        active_borrows_count: res.active_borrows_count,
      };
      localStorage.setItem('auth_user', JSON.stringify(userObj));
      success(`Welcome back to Student Library Portal, ${res.name}!`);
      onLoginSuccess(userObj);
    } catch (err: any) {
      error(err.message || 'Authentication failed. Check your Student ID and password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFirstTimeSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupIdentifier || !newPassword || !confirmPassword) {
      error('Please fill in all setup fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      error('New password and confirmation do not match');
      return;
    }

    if (newPassword.length < 4) {
      error('Password must be at least 4 characters long');
      return;
    }

    try {
      setIsLoading(true);
      if (role === 'student') {
        const res = await api.studentSetupPassword({
          identifier: setupIdentifier,
          new_password: newPassword,
        });
        if (res.access_token) {
          setToken(res.access_token);
          const userObj: AuthUser = {
            role: 'student',
            student_id: res.student_id,
            name: res.name,
            email: res.email,
            department: res.department,
            student_type: res.student_type,
            borrow_limit: res.borrow_limit,
            join_year: res.join_year,
            active_borrows_count: res.active_borrows_count,
          };
          localStorage.setItem('auth_user', JSON.stringify(userObj));
          success(`Password saved in MySQL! Welcome ${res.name}!`);
          onLoginSuccess(userObj);
        }
      } else {
        const res = await api.adminSetupPassword({
          username: setupIdentifier,
          new_password: newPassword,
        });
        if (res.access_token) {
          setToken(res.access_token);
          const userObj: AuthUser = {
            role: 'admin',
            admin_id: res.admin_id,
            username: res.username,
            name: res.username,
            email: 'admin@vitlibrary.ac.in',
          };
          localStorage.setItem('auth_user', JSON.stringify(userObj));
          success('Admin password updated in MySQL! Logged in successfully.');
          onLoginSuccess(userObj);
        }
      }
    } catch (err: any) {
      error(err.message || 'Failed to establish password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-linear-to-tr from-indigo-500 to-blue-600 text-white shadow-xl shadow-indigo-500/30 mb-5">
          <Library className="w-8 h-8" />
        </div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">University Library</h2>
        <p className="mt-2 text-sm text-slate-400">
          Library Lending Management System • MySQL 8.0
        </p>

        {/* Role Selection Switcher Tabs */}
        <div className="mt-6 p-1 bg-slate-900 border border-slate-800 rounded-2xl flex max-w-sm mx-auto shadow-inner">
          <button
            type="button"
            onClick={() => {
              setRole('admin');
              setIsSetupMode(false);
            }}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition cursor-pointer ${
              role === 'admin'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Admin Portal</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setRole('student');
              setIsSetupMode(false);
            }}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition cursor-pointer ${
              role === 'student'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>Student Portal</span>
          </button>
        </div>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        <div className="bg-slate-900/90 backdrop-blur-xl py-8 px-6 shadow-2xl rounded-2xl border border-slate-800 sm:px-10">

          {/* ================= FIRST-TIME PASSWORD SETUP VIEW ================= */}
          {isSetupMode ? (
            <div className="space-y-4">
              <div className="mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4" /> First-Time Security Password Setup
                </span>
                <p className="text-xs text-slate-400 mt-1">
                  Establish your permanent password. Once saved in MySQL, this exact password will be required on every entry.
                </p>
              </div>

              <form className="space-y-4" onSubmit={handleFirstTimeSetup}>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    {role === 'student' ? 'Student ID or Email' : 'Admin Username'}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={setupIdentifier}
                      onChange={(e) => setSetupIdentifier(e.target.value)}
                      required
                      placeholder={role === 'student' ? 'e.g. 1' : 'e.g. admin_rajesh'}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-hidden focus:ring-2 focus:ring-amber-500 text-sm transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Set New Password *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      placeholder="At least 4 characters"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-hidden focus:ring-2 focus:ring-amber-500 text-sm transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      placeholder="Re-type password"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-hidden focus:ring-2 focus:ring-amber-500 text-sm transition"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-amber-600 hover:bg-amber-500 active:scale-[0.99] shadow-lg shadow-amber-600/30 transition disabled:opacity-50 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isLoading ? 'Saving Password to MySQL...' : 'Save Password & Log In'}</span>
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => setIsSetupMode(false)}
                    className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
                  >
                    Already set your password? Return to Regular Sign In
                  </button>
                </div>
              </form>
            </div>
          ) : role === 'admin' ? (
            /* ================= ADMIN REGULAR LOGIN ================= */
            <>
              <div className="mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" /> Librarian / Staff Access
                </span>
              </div>
              <form className="space-y-4" onSubmit={handleAdminLogin}>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Administrator Username
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      placeholder="e.g. admin_rajesh"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-sm transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-sm transition"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] shadow-lg shadow-indigo-600/30 transition disabled:opacity-50 cursor-pointer"
                >
                  <span>{isLoading ? 'Verifying Password...' : 'Sign In as Administrator'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              {/* Password setup link for admin */}
              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setSetupIdentifier(username);
                    setIsSetupMode(true);
                  }}
                  className="text-xs text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
                >
                  First-time staff or need to reset password?
                </button>
              </div>

              {/* Quick Demo Logins for Admins */}
              <div className="mt-5 pt-5 border-t border-slate-800">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-center mb-2.5">
                  Pre-configured Admin Credentials
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setUsername('admin_rajesh');
                      setPassword('Admin@123');
                    }}
                    className="p-2.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-300 text-left border border-slate-700/60 transition cursor-pointer"
                  >
                    <div className="font-semibold text-white flex items-center gap-1.5">
                      <Shield className="w-3 h-3 text-indigo-400" />
                      admin_rajesh
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Password: Admin@123</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setUsername('admin_sangeetha');
                      setPassword('Admin@123');
                    }}
                    className="p-2.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-300 text-left border border-slate-700/60 transition cursor-pointer"
                  >
                    <div className="font-semibold text-white flex items-center gap-1.5">
                      <Shield className="w-3 h-3 text-indigo-400" />
                      admin_sangeetha
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Password: Admin@123</div>
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* ================= STUDENT REGULAR LOGIN ================= */
            <>
              <div className="mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4" /> Student Borrower Self-Service
                </span>
                <p className="text-xs text-slate-400 mt-1">
                  Enter your Student ID and personal password. Matching password is required to permit entry.
                </p>
              </div>

              <form className="space-y-4" onSubmit={handleStudentLogin}>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Student ID or Institutional Email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={studentIdentifier}
                      onChange={(e) => setStudentIdentifier(e.target.value)}
                      required
                      placeholder="e.g. 1 or aarav.sharma@vitstudent.ac.in"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-sm transition"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Password *
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setSetupIdentifier(studentIdentifier);
                        setIsSetupMode(true);
                      }}
                      className="text-[11px] text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
                    >
                      First time here? Set password
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      value={studentPassword}
                      onChange={(e) => setStudentPassword(e.target.value)}
                      placeholder="Enter your established password"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-sm transition"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] shadow-lg shadow-indigo-600/30 transition disabled:opacity-50 cursor-pointer"
                >
                  <span>{isLoading ? 'Verifying Password Match...' : 'Enter Student Portal'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              {/* Quick One-Click Demo Students */}
              <div className="mt-5 pt-5 border-t border-slate-800">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-center mb-2.5">
                  Registered Students in MySQL
                </div>
                <div className="space-y-2 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setStudentIdentifier('1');
                      setStudentPassword('');
                    }}
                    className="w-full p-2.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-300 text-left border border-slate-700/60 transition cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-white flex items-center gap-1.5">
                        <GraduationCap className="w-3.5 h-3.5 text-indigo-400" />
                        Aarav Sharma (ID #1)
                      </div>
                      <div className="text-[10px] text-slate-400">Undergraduate • Max Limit: 3 Books</div>
                    </div>
                    <span className="text-[10px] text-indigo-400 font-semibold bg-indigo-950 px-2 py-0.5 rounded">
                      Select
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setStudentIdentifier('2');
                      setStudentPassword('');
                    }}
                    className="w-full p-2.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-300 text-left border border-slate-700/60 transition cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-white flex items-center gap-1.5">
                        <GraduationCap className="w-3.5 h-3.5 text-indigo-400" />
                        Diya Patel (ID #2)
                      </div>
                      <div className="text-[10px] text-slate-400">Undergraduate • Max Limit: 3 Books</div>
                    </div>
                    <span className="text-[10px] text-indigo-400 font-semibold bg-indigo-950 px-2 py-0.5 rounded">
                      Select
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setStudentIdentifier('6');
                      setStudentPassword('');
                    }}
                    className="w-full p-2.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-300 text-left border border-slate-700/60 transition cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-white flex items-center gap-1.5">
                        <GraduationCap className="w-3.5 h-3.5 text-indigo-400" />
                        Vikram Malhotra (ID #6)
                      </div>
                      <div className="text-[10px] text-slate-400">Postgraduate • Max Limit: 6 Books</div>
                    </div>
                    <span className="text-[10px] text-indigo-400 font-semibold bg-indigo-950 px-2 py-0.5 rounded">
                      Select
                    </span>
                  </button>
                </div>
              </div>
            </>
          )}

        </div>

        <div className="mt-6 text-center text-xs text-slate-500">
          Database Systems Project (BACSE202) • Live MySQL 8.0 Engine
        </div>
      </div>
    </div>
  );
};
