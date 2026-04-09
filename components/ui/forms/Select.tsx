import { type SelectHTMLAttributes } from "react";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> {
  label?: string;
  error?: string;
  required?: boolean;
  variant?: "default" | "error";
  size?: "sm" | "md" | "lg";
  options: SelectOption[];
  placeholder?: string;
}

export function Select({
  label,
  error,
  required = false,
  variant = "default",
  size = "md",
  options,
  placeholder = "選択してください",
  className = "",
  id,
  ...props
}: SelectProps) {
  // Generate ID if not provided
  const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;

  const baseStyles = `
    w-full px-3 py-2 border rounded transition-colors
    focus:ring-2 focus:border-transparent
    disabled:opacity-50 disabled:cursor-not-allowed
    bg-white
  `;

  const variants = {
    default: "border-gray-300 focus:ring-gray-500",
    error: "border-red-300 focus:ring-red-500",
  };

  const sizes = {
    sm: "px-2 py-1 text-sm",
    md: "px-3 py-2 text-base",
    lg: "px-4 py-3 text-lg",
  };

  const currentVariant = error ? "error" : variant;

  return (
    <div className='space-y-1'>
      {label && (
        <label
          className='block text-sm font-medium text-gray-700'
          htmlFor={selectId}
        >
          {label}
          {required && <span className='text-red-500 ml-1'>*</span>}
        </label>
      )}
      <select
        className={`${baseStyles} ${variants[currentVariant]} ${sizes[size]} ${className}`}
        id={selectId}
        {...props}
      >
        {placeholder && (
          <option disabled value=''>
            {placeholder}
          </option>
        )}
        {options.map((option, index) => (
          <option
            key={`${option.value}-${index}`}
            disabled={option.disabled}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className='text-sm text-red-600' role='alert'>
          {error}
        </p>
      )}
    </div>
  );
}
