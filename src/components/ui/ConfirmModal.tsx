import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: 'danger' | 'warning' | 'info';
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  type = 'danger'
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const getColors = () => {
    switch (type) {
      case 'danger':
        return {
          iconBg: 'bg-red-100',
          iconText: 'text-red-600',
          btnBg: 'bg-red-600 hover:bg-red-700',
          btnText: 'text-white'
        };
      case 'warning':
        return {
          iconBg: 'bg-yellow-100',
          iconText: 'text-yellow-600',
          btnBg: 'bg-yellow-600 hover:bg-yellow-700',
          btnText: 'text-white'
        };
      default:
        return {
          iconBg: 'bg-blue-100',
          iconText: 'text-blue-600',
          btnBg: 'bg-blue-600 hover:bg-blue-700',
          btnText: 'text-white'
        };
    }
  };

  const colors = getColors();

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${colors.iconBg} ${colors.iconText}`}>
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="flex-1 pt-1">
              <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
              <p className="text-gray-600">{message}</p>
            </div>
          </div>
        </div>
        <div className="p-4 sm:p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 font-bold hover:bg-gray-200 rounded-xl transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 font-bold rounded-xl transition-colors ${colors.btnBg} ${colors.btnText}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
