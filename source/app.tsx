// Root application component
import { useApp } from "ink";
import { useEffect } from "react";

import Main from "./main.tsx";
import type { Flags } from "./types/cli.types.ts";

// Handle unmounting
let unmount: (() => void) | null = null;

export default function App({ flags }: { flags?: Flags }) {
  const { exit } = useApp();

  // Store unmount function globally
  useEffect(() => {
    if (!unmount) {
      unmount = exit;
    }
  }, [exit]);

  return <Main flags={flags} />;
}
