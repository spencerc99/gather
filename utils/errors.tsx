import { usePathname } from "expo-router";
import { getItem, setItem } from "./asyncStorage";
import { createContext } from "react";

const ErrorStorageKey = "errors";
const MaxErrorWindow = 50;

interface ErrorInfo {
  error: string;
  time: string;
  pathname?: string;
}

export function getErrors(): ErrorInfo[] | null {
  return getItem(ErrorStorageKey);
}

export function logError(err: Error | unknown | string, pathname?: string) {
  console.error(err);
  const errors = getErrors() || [];
  errors.unshift({
    error: err instanceof Error ? err?.message : String(err),
    time: new Date().toISOString(),
    pathname,
  });
  if (errors.length > MaxErrorWindow) {
    errors.pop();
  }
  setItem(ErrorStorageKey, errors);
}

export const ErrorsContext = createContext<{
  logError: (err: Error | unknown | string) => void;
}>({
  logError: () => {},
});

export function ErrorsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <ErrorsContext.Provider
      value={{
        logError: (err: Error | unknown | string) => logError(err, pathname),
      }}
    >
      {children}
    </ErrorsContext.Provider>
  );
}
