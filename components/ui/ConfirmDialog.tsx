"use client";
import Modal from "./Modal";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: "danger" | "primary" | "secondary";
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = "確認",
  message,
  confirmText = "確認",
  cancelText = "キャンセル",
  confirmVariant = "primary",
}: ConfirmDialogProps) {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const variantClasses = {
    danger: "bg-red-500 hover:bg-red-600 focus:ring-red-400",
    primary: "bg-blue-500 hover:bg-blue-600 focus:ring-blue-400",
    secondary: "bg-gray-500 hover:bg-gray-600 focus:ring-gray-400",
  };

  return (
    <Modal isOpen={isOpen} size='sm' title={title} onClose={onClose}>
      <div className='space-y-4'>
        <p className='text-gray-700'>{message}</p>

        <div className='flex justify-end space-x-3'>
          <button
            className='px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-offset-2 focus:ring-gray-500'
            onClick={onClose}
          >
            {cancelText}
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-1 focus:ring-offset-2 ${variantClasses[confirmVariant]}`}
            onClick={handleConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
}
