import { useCallback, useRef } from "react";

export function useMemoizedCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
): T {
  const ref = useRef<{ deps: React.DependencyList; callback: T } | undefined>(
    undefined
  );

  const depsChanged =
    !ref.current ||
    deps.length !== ref.current.deps.length ||
    deps.some((dep, i) => dep !== ref.current!.deps[i]);

  if (depsChanged) {
    ref.current = { deps, callback };
  }

  return useCallback(ref.current!.callback, deps);
}
