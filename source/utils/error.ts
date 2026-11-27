// Error formatting utilities
// Replaces [object Object] errors with meaningful messages

export function formatError(error: unknown): string {
  if (error === null || error === undefined) {
    return "Unknown error";
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  if (typeof error === "number" || typeof error === "boolean") {
    return String(error);
  }

  try {
    const json = JSON.stringify(error, Object.getOwnPropertyNames(error), 2);
    if (json && json !== "{}") {
      return json;
    }
  } catch {}

  if (typeof error === "object") {
    const err = error as Record<string, unknown>;
    if (err.message && typeof err.message === "string") {
      return err.message;
    }

    if (err.error && typeof err.error === "string") {
      return err.error;
    }

    if (err.stderr && typeof err.stderr === "string") {
      return String(err.stderr).slice(0, 500);
    }

    if (err.status !== undefined) {
      return `Error (status ${String(err.status)})`;
    }
  }

  return String(error);
}

export function formatErrorData(error: unknown): Record<string, unknown> {
  if (error === null || error === undefined) {
    return { error: "Unknown error" };
  }

  if (error instanceof Error) {
    return {
      error: error.message,
      stack: error.stack,
      name: error.name,
    };
  }

  if (typeof error === "string") {
    return { error };
  }

  if (typeof error === "number" || typeof error === "boolean") {
    return { error: String(error) };
  }

  if (typeof error === "object") {
    try {
      const data: Record<string, unknown> = {
        error: formatError(error),
      };
      const obj = error as Record<string, unknown>;
      if (obj.stack && typeof obj.stack === "string") {
        data.stack = obj.stack;
      }

      if (obj.code && typeof obj.code === "string") {
        data.code = obj.code;
      }

      if (obj.stderr && typeof obj.stderr === "string") {
        data.stderr = String(obj.stderr).slice(0, 500);
      }

      if (obj.stdout && typeof obj.stdout === "string") {
        data.stdout = String(obj.stdout).slice(0, 500);
      }

      if (obj.status !== undefined) {
        data.status = obj.status;
      }

      return data;
    } catch {
      return { error: String(error) };
    }
  }

  return { error: String(error) };
}
