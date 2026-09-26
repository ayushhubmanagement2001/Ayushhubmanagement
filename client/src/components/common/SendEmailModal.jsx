import React, { useState, useEffect } from 'react';
import { Mail, AtSign, FileText, X, Loader2, Send } from 'lucide-react';
import apiClient from '../../api/apiClient';
import { ENDPOINTS } from '../../api/endpoints';
import { useToast } from '../../context/ToastContext';

export const SendEmailModal = ({
  isOpen,
  onClose,
  reportTitle = 'Report Ledger',
  reportType = 'Report',
  sheetName = 'Report Data',
  defaultRecipient = 'vineetpancheshwar1611@gmail.com',
  defaultSubject = '',
  defaultMessage = '',
  filename = 'Report.xlsx',
  metadata = [], // Array of { label: string, value: string }
  summaryCards = [], // Array of { label: string, value: string | number, subtext?: string, highlight?: boolean, color?: string }
  headers = [],
  rows = [],
  onSuccess,
}) => {
  const { toast } = useToast();
  const [toEmail, setToEmail] = useState(defaultRecipient);
  const [subject, setSubject] = useState(defaultSubject);
  const [customMessage, setCustomMessage] = useState(defaultMessage);
  const [isSending, setIsSending] = useState(false);

  // Sync default values when modal opens or props change
  useEffect(() => {
    if (isOpen) {
      setToEmail(defaultRecipient || 'vineetpancheshwar1611@gmail.com');
      setSubject(defaultSubject || `Ayush Hub Management - ${reportTitle} Export`);
      setCustomMessage(
        defaultMessage ||
          `Please find attached the official ${reportTitle} report export from Ayush Hub Management.`
      );
    }
  }, [isOpen, defaultRecipient, defaultSubject, defaultMessage, reportTitle]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!toEmail || !toEmail.trim()) {
      toast.error('Recipient email address is required.');
      return;
    }

    if (!headers || headers.length === 0 || !rows || rows.length === 0) {
      toast.error('No table data records found to export and send.');
      return;
    }

    try {
      setIsSending(true);

      const payload = {
        toEmail: toEmail.trim(),
        subject: subject.trim() || `Ayush Hub Management - ${reportTitle} Export`,
        customMessage: customMessage.trim(),
        reportTitle,
        reportType,
        sheetName,
        filename,
        metadata,
        summaryCards,
        headers,
        rows,
      };

      const res = await apiClient.post(ENDPOINTS.EMAIL.SEND_REPORT, payload);

      if (res?.success) {
        toast.success(res.message || `${reportTitle} report successfully sent to ${toEmail.trim()}!`);
        if (onSuccess) onSuccess();
        onClose();
      } else {
        toast.error(res?.message || 'Failed to deliver email. Please try again.');
      }
    } catch (err) {
      toast.error(err?.message || 'Failed to send email. Please check server settings.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white border border-gray-200 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-rose-50/50 via-white to-gray-50/30">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100 shadow-2xs">
              <Mail className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Send {reportTitle} via Email</h3>
              <p className="text-[11px] text-gray-500">
                Directly email the exported Excel report to any recipient
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Recipient Email */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Recipient Email *
            </label>
            <div className="relative">
              <AtSign className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                placeholder="e.g. recipient@gmail.com"
                value={toEmail}
                onChange={(e) => setToEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600 font-medium transition-all"
              />
            </div>
            <p className="text-[10px] text-gray-400 mt-1">
              Default recipient is <span className="font-semibold text-gray-700">{defaultRecipient}</span>.
            </p>
          </div>

          {/* Subject Line */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Email Subject *
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                placeholder="Email Subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600 font-semibold text-gray-800 transition-all"
              />
            </div>
          </div>

          {/* Message / Notes */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Message / Notes (Optional)
            </label>
            <textarea
              rows="2"
              placeholder="Add any extra notes or message for the recipient..."
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600 font-medium resize-none transition-all"
            />
          </div>

          {/* Attachment Preview Card */}
          <div className="bg-gray-50/80 border border-gray-200/80 rounded-xl p-3.5 space-y-2">
            {metadata.length > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500 font-medium">Context / Filters:</span>
                <span className="font-bold text-gray-900">
                  {metadata.map((m) => `${m.label}: ${m.value}`).join(' • ')}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500 font-medium">Records Included:</span>
              <span className="font-bold text-gray-900">{rows.length} Records</span>
            </div>

            {summaryCards && summaryCards.length > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500 font-medium">{summaryCards[0].label}:</span>
                <span
                  className={`font-extrabold ${
                    summaryCards[0].color === 'emerald' || summaryCards[0].highlight
                      ? 'text-emerald-600'
                      : 'text-gray-900'
                  }`}
                >
                  {summaryCards[0].value}
                </span>
              </div>
            )}

            <div className="pt-2 border-t border-gray-200/60 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-rose-700 bg-rose-50 px-2 py-1 rounded-lg border border-rose-100 truncate max-w-[280px]">
                <span>📎</span>
                <span className="truncate">{filename}</span>
              </div>
              <span className="text-[10px] font-bold text-emerald-600 shrink-0">
                Excel (.xlsx)
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              disabled={isSending}
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSending || rows.length === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#E53935] hover:bg-[#D32F2F] rounded-xl shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Sending Email...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Report Mail</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
