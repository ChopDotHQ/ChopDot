import React from 'react';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  body: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  open,
  title,
  body,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40">
      <div className="w-full md:w-[440px] bg-card rounded-2xl shadow-lg p-4 m-2">
        <h3 className="text-base font-semibold mb-2">{title}</h3>
        <p className="text-secondary text-sm mb-4">{body}</p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl border border-border"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

