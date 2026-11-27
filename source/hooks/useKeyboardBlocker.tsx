import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type KeyboardBlockContextValue = {
  blockCount: number;
  increment: () => void;
  decrement: () => void;
};

const KeyboardBlockContext = createContext<KeyboardBlockContextValue | null>(
  null,
);

export function KeyboardBlockProvider({ children }: { children: ReactNode }) {
  const [blockCount, setBlockCount] = useState(0);

  const increment = useCallback(() => {
    setBlockCount(prev => prev + 1);
  }, []);

  const decrement = useCallback(() => {
    setBlockCount(prev => Math.max(0, prev - 1));
  }, []);

  const value = useMemo(
    () => ({ blockCount, increment, decrement }),
    [blockCount, increment, decrement],
  );

  return (
    <KeyboardBlockContext.Provider value={value}>
      {children}
    </KeyboardBlockContext.Provider>
  );
}

export function useKeyboardBlockContext() {
  const context = useContext(KeyboardBlockContext);
  if (!context) {
    throw new Error(
      "useKeyboardBlockContext must be used within KeyboardBlockProvider",
    );
  }
  return context;
}

export function useKeyboardBlocker(shouldBlock: boolean) {
  const { increment, decrement } = useKeyboardBlockContext();
  const blockedRef = useRef(false);

  useEffect(() => {
    if (shouldBlock && !blockedRef.current) {
      increment();
      blockedRef.current = true;
    } else if (!shouldBlock && blockedRef.current) {
      decrement();
      blockedRef.current = false;
    }

    return () => {
      if (blockedRef.current) {
        decrement();
        blockedRef.current = false;
      }
    };
  }, [shouldBlock, increment, decrement]);
}

export function useIsKeyboardBlocked() {
  const { blockCount } = useKeyboardBlockContext();
  return blockCount > 0;
}
