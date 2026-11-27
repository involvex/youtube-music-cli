const ARROW_CODES: Record<string, string> = {
  "\x1B[A": "up",
  "\x1B[B": "down",
  "\x1B[C": "right",
  "\x1B[D": "left",
};

const CTRL_LETTER_CODES: Record<string, string> = {
  "\x01": "Ctrl+A",
  "\x0c": "Ctrl+L",
};

const CTRL_COMMA_CSI = /^\x1b\[44;5(?:;[123])?u$/;

function parseShiftLetter(data: string): string | null {
  if (data.length !== 1 || data < "A" || data > "Z") {
    return null;
  }

  return `Shift+${data}`;
}

export function parseKeyName(data: string): string | null {
  if (CTRL_COMMA_CSI.test(data)) {
    return "Ctrl+,";
  }

  if (CTRL_LETTER_CODES[data]) {
    return CTRL_LETTER_CODES[data]!;
  }

  if (ARROW_CODES[data]) {
    return ARROW_CODES[data]!;
  }

  if (data === "\x1b") {
    return "escape";
  }

  if (data === "\t") {
    return "tab";
  }

  if (data === ",") {
    return ",";
  }

  if (data === " ") {
    return " ";
  }

  if (data === "\x03") {
    return "Ctrl+C";
  }

  if (data === "\r" || data === "\n") {
    return "enter";
  }

  if (data === "\x7F" || data === "\b") {
    return "backspace";
  }

  if (data === "-") {
    return "-";
  }

  if (data === "+" || data === "=") {
    return "+";
  }

  if (data.length === 1 && data >= "a" && data <= "z") {
    return data;
  }

  const shiftKey = parseShiftLetter(data);
  if (shiftKey) {
    return shiftKey;
  }

  if (data === "/" || data === "?") {
    return "/";
  }

  return null;
}
