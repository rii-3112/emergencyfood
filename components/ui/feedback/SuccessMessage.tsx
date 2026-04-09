export interface SuccessMessageProps {
  message: string;
  className?: string;
}

export function SuccessMessage({
  message,
  className = "",
}: SuccessMessageProps) {
  return (
    <div
      className={`bg-green-50 border border-green-200 text-green-700 px-3 sm:px-4 py-3 rounded mb-4 text-sm ${className}`}
      role='alert'
    >
      <div className='flex items-center'>
        <svg
          aria-hidden='true'
          className='w-4 h-4 mr-2 flex-shrink-0'
          fill='currentColor'
          viewBox='0 0 20 20'
        >
          <path
            clipRule='evenodd'
            d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z'
            fillRule='evenodd'
          />
        </svg>
        <span>{message}</span>
      </div>
    </div>
  );
}
