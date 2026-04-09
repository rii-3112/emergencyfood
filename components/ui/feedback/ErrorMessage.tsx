export interface ErrorMessageProps {
  message: string;
  className?: string;
}

export function ErrorMessage({ message, className = "" }: ErrorMessageProps) {
  return (
    <div
      className={`bg-red-50 border border-red-200 text-red-700 px-3 sm:px-4 py-3 rounded mb-4 text-sm ${className}`}
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
            d='M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z'
            fillRule='evenodd'
          />
        </svg>
        <span>{message}</span>
      </div>
    </div>
  );
}
