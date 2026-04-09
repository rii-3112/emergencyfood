interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function LoadingSpinner({
  size = "md",
  className = "",
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  };

  return (
    <div
      aria-label='読み込み中'
      className={`animate-spin rounded-full border-2 border-gray-300 border-t-gray-900 ${sizeClasses[size]} ${className}`}
      role='status'
    >
      <span className='sr-only'>読み込み中...</span>
    </div>
  );
}
