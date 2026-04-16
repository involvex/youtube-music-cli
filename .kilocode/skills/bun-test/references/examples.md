# Test Examples and Patterns

Comprehensive test examples for common scenarios with Bun's test runner.

## Unit Tests

### Testing Functions

```typescript
import { describe, it, expect } from "bun:test";

// utils.ts
export function add(a: number, b: number): number {
  return a + b;
}

export function multiply(a: number, b: number): number {
  return a * b;
}

// utils.test.ts
describe("Math utilities", () => {
  it("should add numbers", () => {
    expect(add(2, 3)).toBe(5);
    expect(add(-1, 1)).toBe(0);
  });

  it("should multiply numbers", () => {
    expect(multiply(2, 3)).toBe(6);
    expect(multiply(0, 5)).toBe(0);
  });
});
```

### Testing Classes

```typescript
class Calculator {
  private history: number[] = [];

  add(a: number, b: number): number {
    const result = a + b;
    this.history.push(result);
    return result;
  }

  getHistory(): number[] {
    return [...this.history];
  }
}

describe("Calculator", () => {
  it("should calculate and store history", () => {
    const calc = new Calculator();

    expect(calc.add(2, 3)).toBe(5);
    expect(calc.add(10, 5)).toBe(15);
    expect(calc.getHistory()).toEqual([5, 15]);
  });
});
```

## Async Tests

### Testing Promises

```typescript
async function fetchData(url: string): Promise<any> {
  const response = await fetch(url);
  return response.json();
}

it("should fetch data", async () => {
  const data = await fetchData("https://api.example.com/data");
  expect(data).toBeDefined();
});

it("should handle errors", async () => {
  await expect(
    fetchData("https://api.example.com/invalid")
  ).rejects.toThrow();
});
```

### Testing Async/Await

```typescript
describe("Async operations", () => {
  it("should wait for async function", async () => {
    const result = await new Promise((resolve) => {
      setTimeout(() => resolve("done"), 100);
    });

    expect(result).toBe("done");
  });

  it("should handle async errors", async () => {
    const asyncError = async () => {
      throw new Error("Async error");
    };

    await expect(asyncError()).rejects.toThrow("Async error");
  });
});
```

## Snapshot Testing

### Component Snapshots

```typescript
import { test, expect } from "bun:test";

test("should match component snapshot", () => {
  const component = {
    type: "button",
    props: {
      onClick: () => {},
      children: "Click me",
    },
  };

  expect(component).toMatchSnapshot();
});
```

### Inline Snapshots

```typescript
test("should match inline snapshot", () => {
  const config = {
    theme: "dark",
    language: "en",
  };

  expect(config).toMatchInlineSnapshot(`
    {
      "theme": "dark",
      "language": "en"
    }
  `);
});
```

## API Testing

### REST API Tests

```typescript
describe("User API", () => {
  it("should GET users", async () => {
    const response = await fetch("http://localhost:3000/api/users");
    const users = await response.json();

    expect(response.status).toBe(200);
    expect(users).toBeArray();
  });

  it("should POST new user", async () => {
    const newUser = {
      name: "Test User",
      email: "test@example.com",
    };

    const response = await fetch("http://localhost:3000/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newUser),
    });

    const created = await response.json();

    expect(response.status).toBe(201);
    expect(created).toMatchObject(newUser);
  });
});
```

### GraphQL Tests

```typescript
it("should query GraphQL API", async () => {
  const query = `
    query {
      user(id: 1) {
        name
        email
      }
    }
  `;

  const response = await fetch("http://localhost:3000/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });

  const result = await response.json();

  expect(result.data.user).toBeDefined();
  expect(result.data.user.name).toBeTruthy();
});
```

## Database Testing

### With Setup and Teardown

```typescript
import { beforeAll, afterAll, beforeEach, describe, it, expect } from "bun:test";

let db: Database;

beforeAll(async () => {
  // Setup database connection
  db = await connectToDatabase();
});

afterAll(async () => {
  // Close database connection
  await db.close();
});

beforeEach(async () => {
  // Clear test data
  await db.query("DELETE FROM users WHERE email LIKE '%@test.com'");
});

describe("User repository", () => {
  it("should create user", async () => {
    const user = await db.users.create({
      name: "Test User",
      email: "test@test.com",
    });

    expect(user.id).toBeDefined();
    expect(user.name).toBe("Test User");
  });

  it("should find user by email", async () => {
    await db.users.create({
      name: "Test User",
      email: "find@test.com",
    });

    const found = await db.users.findByEmail("find@test.com");

    expect(found).toBeDefined();
    expect(found.name).toBe("Test User");
  });
});
```

## Error Handling

### Testing Exceptions

```typescript
describe("Error handling", () => {
  it("should throw for invalid input", () => {
    const divide = (a: number, b: number) => {
      if (b === 0) throw new Error("Division by zero");
      return a / b;
    };

    expect(() => divide(10, 0)).toThrow("Division by zero");
    expect(() => divide(10, 0)).toThrow(Error);
  });

  it("should reject promise", async () => {
    const asyncReject = async () => {
      throw new Error("Rejected");
    };

    await expect(asyncReject()).rejects.toThrow("Rejected");
  });
});
```

## Matchers Reference

### Common Matchers

```typescript
// Equality
expect(value).toBe(expected);           // ===
expect(value).toEqual(expected);        // Deep equality
expect(value).toStrictEqual(expected);  // Strict deep equality

// Truthiness
expect(value).toBeTruthy();
expect(value).toBeFalsy();
expect(value).toBeNull();
expect(value).toBeUndefined();
expect(value).toBeDefined();

// Numbers
expect(number).toBeGreaterThan(3);
expect(number).toBeGreaterThanOrEqual(3);
expect(number).toBeLessThan(5);
expect(number).toBeLessThanOrEqual(5);
expect(number).toBeCloseTo(0.3, 5);  // Floating point

// Strings
expect(string).toMatch(/pattern/);
expect(string).toContain("substring");

// Arrays
expect(array).toContain(item);
expect(array).toHaveLength(3);
expect(array).toBeArray();

// Objects
expect(object).toHaveProperty("key");
expect(object).toHaveProperty("key", value);
expect(object).toMatchObject({ subset });

// Functions
expect(fn).toThrow();
expect(fn).toThrow(Error);
expect(fn).toThrow("message");

// Promises
await expect(promise).resolves.toBe(value);
await expect(promise).rejects.toThrow();

// Mock functions
expect(mockFn).toHaveBeenCalled();
expect(mockFn).toHaveBeenCalledTimes(3);
expect(mockFn).toHaveBeenCalledWith(arg1, arg2);
expect(mockFn).toHaveReturnedWith(value);
```

## Test Organization

### Nested Describes

```typescript
describe("User management", () => {
  describe("Authentication", () => {
    it("should login with valid credentials", () => {
      // test
    });

    it("should reject invalid credentials", () => {
      // test
    });
  });

  describe("Authorization", () => {
    it("should allow admin access", () => {
      // test
    });

    it("should deny regular user access", () => {
      // test
    });
  });
});
```

### Test Isolation

```typescript
describe("Isolated tests", () => {
  let counter: number;

  beforeEach(() => {
    counter = 0; // Reset before each test
  });

  it("should increment counter", () => {
    counter++;
    expect(counter).toBe(1);
  });

  it("should start from zero", () => {
    expect(counter).toBe(0); // Isolated from previous test
  });
});
```

## Performance Testing

### Timing Tests

```typescript
it("should complete within time limit", async () => {
  const start = performance.now();

  await someOperation();

  const duration = performance.now() - start;
  expect(duration).toBeLessThan(1000); // Must complete within 1 second
});
```

### Load Testing

```typescript
it("should handle multiple concurrent requests", async () => {
  const requests = Array.from({ length: 100 }, (_, i) =>
    fetch(`http://localhost:3000/api/data/${i}`)
  );

  const responses = await Promise.all(requests);

  expect(responses.every((r) => r.ok)).toBe(true);
});
```
