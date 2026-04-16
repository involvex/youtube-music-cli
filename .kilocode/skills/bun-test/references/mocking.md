# Mocking Patterns in Bun Test

Complete guide to mocking functions, modules, and objects in Bun's test runner.

## Mock Functions

### Basic Mock

```typescript
import { describe, it, expect, mock } from "bun:test";

describe("Mock functions", () => {
  it("should create mock functions", () => {
    const mockFn = mock((x: number) => x * 2);

    const result = mockFn(5);

    expect(result).toBe(10);
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledWith(5);
  });
});
```

### Mock Return Values

```typescript
it("should implement mock return values", () => {
  const mockFn = mock(() => "default");
  mockFn.mockReturnValue("mocked");

  expect(mockFn()).toBe("mocked");
});

it("should implement mock return value once", () => {
  const mockFn = mock();
  mockFn.mockReturnValueOnce("first");
  mockFn.mockReturnValueOnce("second");
  mockFn.mockReturnValue("default");

  expect(mockFn()).toBe("first");
  expect(mockFn()).toBe("second");
  expect(mockFn()).toBe("default");
});
```

### Mock Implementations

```typescript
it("should implement mock implementations", () => {
  const mockFn = mock();
  mockFn.mockImplementation((x: number) => x + 1);

  expect(mockFn(5)).toBe(6);
});

it("should implement mock implementation once", () => {
  const mockFn = mock();
  mockFn.mockImplementationOnce((x) => x * 2);
  mockFn.mockImplementation((x) => x * 3);

  expect(mockFn(5)).toBe(10);
  expect(mockFn(5)).toBe(15);
});
```

### Tracking Calls

```typescript
it("should track mock calls", () => {
  const mockFn = mock();

  mockFn(1, 2);
  mockFn(3, 4);

  expect(mockFn.mock.calls).toEqual([[1, 2], [3, 4]]);
  expect(mockFn.mock.calls[0]).toEqual([1, 2]);
  expect(mockFn.mock.calls.length).toBe(2);
});

it("should track return values", () => {
  const mockFn = mock((x) => x * 2);

  mockFn(5);
  mockFn(10);

  expect(mockFn.mock.results).toEqual([
    { type: 'return', value: 10 },
    { type: 'return', value: 20 }
  ]);
});
```

## Spying on Methods

### Basic Spy

```typescript
import { spyOn } from "bun:test";

it("should spy on object methods", () => {
  const obj = {
    method: (x: number) => x * 2,
  };

  const spy = spyOn(obj, "method");

  obj.method(5);

  expect(spy).toHaveBeenCalledWith(5);
  expect(spy).toHaveBeenCalledTimes(1);
  expect(spy).toHaveReturnedWith(10);
});
```

### Spy Implementation

```typescript
it("should override spy implementation", () => {
  const obj = {
    method: (x: number) => x * 2,
  };

  const spy = spyOn(obj, "method").mockImplementation((x) => x * 3);

  expect(obj.method(5)).toBe(15);
  expect(spy).toHaveBeenCalled();
});
```

### Restore Spy

```typescript
it("should restore original implementation", () => {
  const obj = {
    method: (x: number) => x * 2,
  };

  const spy = spyOn(obj, "method").mockImplementation((x) => x * 3);

  expect(obj.method(5)).toBe(15);

  spy.mockRestore();

  expect(obj.method(5)).toBe(10); // Original implementation
});
```

## Module Mocking

### Manual Module Mocks

```typescript
// Create a manual mock
const mockFetchUser = mock(() => ({ id: 1, name: "Test User" }));
const mockCreateUser = mock(() => ({ success: true }));

const api = {
  fetchUser: mockFetchUser,
  createUser: mockCreateUser,
};

it("should use mocked module", async () => {
  const user = await api.fetchUser(1);
  expect(user).toEqual({ id: 1, name: "Test User" });
  expect(mockFetchUser).toHaveBeenCalledWith(1);
});
```

### Dependency Injection

```typescript
// api.ts
export interface ApiClient {
  fetchUser(id: number): Promise<User>;
}

export class UserService {
  constructor(private api: ApiClient) {}

  async getUser(id: number) {
    return this.api.fetchUser(id);
  }
}

// test
it("should use injected dependency", async () => {
  const mockApi: ApiClient = {
    fetchUser: mock(() => Promise.resolve({ id: 1, name: "Test" })),
  };

  const service = new UserService(mockApi);
  const user = await service.getUser(1);

  expect(user.name).toBe("Test");
});
```

## Async Mocks

### Promise Mocks

```typescript
it("should mock promises", async () => {
  const mockFn = mock(() => Promise.resolve("data"));

  const result = await mockFn();

  expect(result).toBe("data");
  expect(mockFn).toHaveBeenCalled();
});

it("should mock rejected promises", async () => {
  const mockFn = mock(() => Promise.reject(new Error("Failed")));

  await expect(mockFn()).rejects.toThrow("Failed");
});
```

### Async Function Mocks

```typescript
it("should mock async functions", async () => {
  const mockFn = mock(async (x: number) => {
    await new Promise(resolve => setTimeout(resolve, 10));
    return x * 2;
  });

  const result = await mockFn(5);

  expect(result).toBe(10);
});
```

## Clearing and Resetting Mocks

### Clear Mock Calls

```typescript
it("should clear mock history", () => {
  const mockFn = mock();

  mockFn(1);
  expect(mockFn).toHaveBeenCalledTimes(1);

  mockFn.mockClear();

  expect(mockFn).toHaveBeenCalledTimes(0);
  mockFn(2);
  expect(mockFn).toHaveBeenCalledTimes(1);
});
```

### Reset Mocks

```typescript
it("should reset mock implementation", () => {
  const mockFn = mock(() => "initial");
  mockFn.mockReturnValue("changed");

  expect(mockFn()).toBe("changed");

  mockFn.mockReset();

  expect(mockFn()).toBeUndefined(); // Back to no implementation
});
```

### Global Mock Management

```typescript
import { beforeEach, afterEach } from "bun:test";

beforeEach(() => {
  // Clear all mocks before each test
});

afterEach(() => {
  // Restore all mocks after each test
});
```

## Advanced Patterns

### Partial Mocks

```typescript
const obj = {
  method1: (x) => x * 2,
  method2: (x) => x * 3,
};

const spy1 = spyOn(obj, "method1");
// method2 remains unmocked

expect(obj.method1(5)).toBeDefined(); // Mocked
expect(obj.method2(5)).toBe(15); // Original
```

### Conditional Mocks

```typescript
it("should mock conditionally", () => {
  const mockFn = mock((x: number) => {
    if (x > 10) return "large";
    return "small";
  });

  expect(mockFn(5)).toBe("small");
  expect(mockFn(15)).toBe("large");
});
```

### Chaining Mock Calls

```typescript
it("should chain mock methods", () => {
  const mockFn = mock()
    .mockReturnValueOnce("first")
    .mockReturnValueOnce("second")
    .mockReturnValue("default");

  expect(mockFn()).toBe("first");
  expect(mockFn()).toBe("second");
  expect(mockFn()).toBe("default");
});
```

## Testing with Mocks

### API Mocking

```typescript
it("should mock API calls", async () => {
  const mockFetch = mock(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ data: "test" }),
    })
  );

  global.fetch = mockFetch as any;

  const response = await fetch("/api/data");
  const data = await response.json();

  expect(data).toEqual({ data: "test" });
  expect(mockFetch).toHaveBeenCalledWith("/api/data");
});
```

### Timer Mocking

```typescript
it("should test delayed operations", async () => {
  const callback = mock();

  setTimeout(callback, 1000);

  // Wait for timer
  await new Promise(resolve => setTimeout(resolve, 1100));

  expect(callback).toHaveBeenCalled();
});
```

## Best Practices

1. **Clear mocks between tests**: Use `beforeEach` to reset state
2. **Mock at boundaries**: Mock external dependencies, not internal functions
3. **Verify behavior**: Use `.toHaveBeenCalledWith()` to ensure correct arguments
4. **Don't over-mock**: Only mock what's necessary for the test
5. **Use type-safe mocks**: Leverage TypeScript for mock definitions

## Common Patterns

### Database Mock

```typescript
const mockDb = {
  query: mock((sql: string) => Promise.resolve([])),
  insert: mock((table: string, data: any) => Promise.resolve({ id: 1 })),
};
```

### Logger Mock

```typescript
const mockLogger = {
  info: mock(),
  warn: mock(),
  error: mock(),
};
```

### File System Mock

```typescript
const mockFs = {
  readFile: mock(() => Promise.resolve("file contents")),
  writeFile: mock(() => Promise.resolve()),
};
```
