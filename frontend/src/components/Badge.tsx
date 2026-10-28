import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'neutral';
  className?: string;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  className = '',
  size = 'md',
}) => {
  const variantStyles = {
    primary: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    secondary: 'bg-sky-50 text-sky-700 border-sky-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    info: 'bg-blue-50 text-blue-700 border-blue-200',
    neutral: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  const sizeStyles = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1 font-medium',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60"></span>
      {children}
    </span>
  );
};

export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  switch (status?.toLowerCase()) {
    case 'issued':
      return <Badge variant="info">Issued</Badge>;
    case 'returned':
      return <Badge variant="success">Returned</Badge>;
    case 'overdue':
      return <Badge variant="danger">Overdue</Badge>;
    case 'damaged':
      return <Badge variant="warning">Damaged</Badge>;
    case 'lost':
      return <Badge variant="neutral">Lost</Badge>;
    case 'paid':
      return <Badge variant="success">Paid</Badge>;
    case 'unpaid':
      return <Badge variant="danger">Unpaid</Badge>;
    case 'waived':
      return <Badge variant="secondary">Waived</Badge>;
    case 'undergraduate':
      return <Badge variant="primary">Undergraduate (3 books)</Badge>;
    case 'postgraduate':
      return <Badge variant="secondary">Postgraduate (6 books)</Badge>;
    default:
      return <Badge variant="neutral">{status}</Badge>;
  }
};
