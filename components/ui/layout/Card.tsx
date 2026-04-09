import React from "react";

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md" | "lg";
  shadow?: "none" | "sm" | "md" | "lg";
}

export function Card({
  children,
  className = "",
  padding = "md",
  shadow = "md",
}: CardProps) {
  const baseStyles = "bg-white rounded-lg border border-gray-200";

  const paddings = {
    none: "",
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
  };

  const shadows = {
    none: "",
    sm: "shadow-sm",
    md: "shadow-md",
    lg: "shadow-lg",
  };

  return (
    <div
      className={`${baseStyles} ${paddings[padding]} ${shadows[shadow]} ${className}`}
    >
      {children}
    </div>
  );
}
