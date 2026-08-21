"use client";

export type ToastVariant = "default" | "success" | "error";

export interface ToastProps {
  message: string;
  variant?: ToastVariant;
}

const variantClasses: Record<ToastVariant, string> = {
  default: "bg-gray-800 text-white",
  success: "bg-gray-800 text-white",
  error: "bg-red-700 text-white",
};

export function Toast({ message, variant = "default" }: ToastProps) {
  return (
    <div
      className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg z-[9999] max-w-sm text-sm ${variantClasses[variant]}`}
      role='status'
    >
      {message}
    </div>
  );
}
