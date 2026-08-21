"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { ToastVariant } from "@/components/ui/feedback/Toast";

type ToastState = {
  message: string;
  variant: ToastVariant;
} | null;

export function useToast(durationMs = 2500) {
  const [toast, setToast] = useState<ToastState>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const showToast = useCallback(
    (message: string, variant: ToastVariant = "default") => {
      clearTimer();
      setToast({ message, variant });
      timeoutRef.current = setTimeout(() => {
        setToast(null);
        timeoutRef.current = null;
      }, durationMs);
    },
    [clearTimer, durationMs]
  );

  useEffect(() => clearTimer, [clearTimer]);

  return { toast, showToast };
}
