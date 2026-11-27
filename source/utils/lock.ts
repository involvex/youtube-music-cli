export function createMutex() {
  let lock = Promise.resolve();

  return async (): Promise<() => void> => {
    const current = lock;
    let release: () => void = () => {};
    lock = new Promise<void>(resolve => {
      release = resolve;
    });
    await current.catch(() => {});
    return release;
  };
}

export type Mutex = ReturnType<typeof createMutex>;
