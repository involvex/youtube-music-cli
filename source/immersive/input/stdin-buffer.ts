import { parseKeyName } from "./key-parser.ts";

const FLUSH_MS = 50;

function isCompleteEscapeSequence(data: string): boolean {
  if (!data.startsWith("\x1b")) {
    return data.length >= 1;
  }

  if (data.length === 1) {
    return false;
  }

  if (data.startsWith("\x1b[")) {
    if (/^\x1b\[[\d;]*u$/.test(data)) {
      return true;
    }

    if (/^\x1b\[[\d;]*[A-Za-z~]$/.test(data)) {
      return true;
    }

    return false;
  }

  return data.length >= 2;
}

export class StdinKeyBuffer {
  private buffer = "";
  private timer: ReturnType<typeof setTimeout> | null = null;
  private readonly onKey: (key: string) => void;

  constructor(onKey: (key: string) => void) {
    this.onKey = onKey;
  }

  push(data: string): void {
    this.buffer += data;

    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    if (this.buffer.length === 1 && this.buffer !== "\x1b") {
      this.flush();
      return;
    }

    if (isCompleteEscapeSequence(this.buffer)) {
      this.flush();
      return;
    }

    this.timer = setTimeout(() => {
      this.flush();
    }, FLUSH_MS);
  }

  dispose(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    this.buffer = "";
  }

  private flush(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    if (this.buffer.length === 0) {
      return;
    }

    const data = this.buffer;
    this.buffer = "";
    const keyName = parseKeyName(data);
    if (keyName) {
      this.onKey(keyName);
    }
  }
}
