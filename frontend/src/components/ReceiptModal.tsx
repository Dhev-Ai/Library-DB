import React from 'react';
import { Modal } from './Modal';
import { Printer, Library, CheckCircle2, DollarSign } from 'lucide-react';
import type { LendingRecord } from '../types';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: LendingRecord | null;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ isOpen, onClose, record }) => {
  if (!record) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="University Circulation Slip" maxWidth="md">
      <div id="printable-receipt" className="p-4 bg-white space-y-4">
        {/* Slip Header */}
        <div className="text-center pb-4 border-b border-dashed border-slate-300">
          <div className="inline-flex p-2 rounded-xl bg-slate-900 text-white mb-2">
            <Library className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold text-slate-900">UNIVERSITY CENTRAL LIBRARY</h2>
          <p className="text-xs text-slate-500 font-mono">CIRCULATION DESK • TRANSACTION #{record.lending_id}</p>
        </div>

        {/* Transaction Summary */}
        <div className="space-y-2 text-xs">
          <div className="flex justify-between py-1 border-b border-slate-100">
            <span className="text-slate-500">Student Borrower:</span>
            <span className="font-bold text-slate-900">{record.student_name} (ID: #{record.student_id})</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-100">
            <span className="text-slate-500">Book Title:</span>
            <span className="font-bold text-slate-900 text-right max-w-[200px] truncate">{record.book_title}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-100">
            <span className="text-slate-500">Book ID:</span>
            <span className="font-mono text-slate-700">#{record.book_id}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-100">
            <span className="text-slate-500">Date of Issue:</span>
            <span className="font-mono text-slate-700">{record.issue_date}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-100">
            <span className="text-slate-500">Scheduled Due Date:</span>
            <span className="font-mono font-bold text-slate-900">{record.due_date}</span>
          </div>
          {record.return_date && (
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Actual Return Date:</span>
              <span className="font-mono font-bold text-emerald-700">{record.return_date}</span>
            </div>
          )}
          <div className="flex justify-between py-1 border-b border-slate-100">
            <span className="text-slate-500">Circulation Status:</span>
            <span className="font-bold text-slate-900 uppercase">{record.status}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-100">
            <span className="text-slate-500">Issuing Librarian:</span>
            <span className="text-slate-700">{record.admin_name}</span>
          </div>
        </div>

        {/* Fine section if applicable */}
        {record.fine_amount ? (
          <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-xs flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="font-bold text-rose-900">Fine Assessed (#{record.fine_id})</div>
              <div className="text-[11px] text-rose-700">
                Status: {record.fine_status} {record.damage_note && `• ${record.damage_note}`}
              </div>
            </div>
            <div className="font-mono text-base font-bold text-rose-900">
              ${Number(record.fine_amount).toFixed(2)}
            </div>
          </div>
        ) : (
          <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>No outstanding fines assessed on this transaction.</span>
          </div>
        )}

        {/* Barcode & Footer */}
        <div className="pt-4 border-t border-dashed border-slate-300 text-center space-y-1">
          <div className="font-mono text-[10px] tracking-widest text-slate-400">
            *||||| | ||| |||| | ||||||| |||*
          </div>
          <p className="text-[10px] text-slate-400">
            Please retain this slip for library record verification. Books must be returned on or before due date.
          </p>
        </div>

        {/* Print Button */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Circulation Slip</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
