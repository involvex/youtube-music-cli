# Migrating from Jest to Bun Test

Complete guide for migrating Jest test suites to Bun's built-in test runner.

## API Compatibility

Bun test provides Jest-compatible APIs for seamless migration:

| Jest API | Bun Test | Status |
|----------|----------|--------|
| `describe`, `it`, `test` | ✅ Identical | Fully supported |
| `expect` with matchers | ✅ Identical | Most matchers supported |
| `beforeAll`, `afterAll` | ✅ Identical | Fully supported |
| `beforeEach`, `afterEach` | ✅ Identical | Fully supported |
| `jest.fn()` | `mock()` | Different import |
| `jest.spyOn()` | `spyOn()` | Different import |
| Snapshot testing | ✅ Identical | Fully supported |
| Async testing | ✅ Identical | Fully supported |

## Migration Steps

### 1. Update Imports

**Before (Jest):**
```typescript
import { describe, it, expect } from '@jest/globals';
import { jest } from '@jest/globals';
```

**After (Bun):**
```typescript
import { describe, it, expect, mock, spyOn } from 'bun:test';
```

### 2. Update Mock Syntax

**Before (Jest):**
```typescript
const mockFn = jest.fn();
jest.fn((x) => x * 2);
jest.spyOn(obj, 'method');
```

**After (Bun):**
```typescript
const mockFn = mock();
mock((x) => x * 2);
spyOn(obj, 'method');
```

### 3. Update Configuration

**Remove Jest config files:**
```bash
rm jest.config.js
rm jest.setup.js
```

**Create bunfig.toml:**
```toml
[test]
preload = ["./tests/setup.ts"]
coverage = true
coverageDir = "coverage"
coverageThreshold = 80
timeout = 5000
```

### 4. Update package.json

**Before:**
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  },
  "devDependencies": {
    "jest": "^29.0.0",
    "@types/jest": "^29.0.0"
  }
}
```

**After:**
```json
{
  "scripts": {
    "test": "bun test",
    "test:watch": "bun test --watch",
    "test:coverage": "bun test --coverage"
  }
}
```

Remove Jest dependencies:
```bash
bun remove jest @types/jest ts-jest
```

## Jest Features Not Yet Supported

### Module Mocking

Jest's `jest.mock()` for entire modules has limited support:

**Jest (advanced mocking):**
```typescript
jest.mock('./api', () => ({
  fetchUser: jest.fn(),
}));
```

**Workaround in Bun:**
```typescript
// Use dependency injection or manual mocking
import { mock } from 'bun:test';

const mockFetchUser = mock();
const api = { fetchUser: mockFetchUser };
```

### Fake Timers

Jest's `jest.useFakeTimers()` is not yet available:

**Workaround:**
```typescript
// Use manual time control
let currentTime = Date.now();
const originalDateNow = Date.now;

beforeEach(() => {
  Date.now = () => currentTime;
});

afterEach(() => {
  Date.now = originalDateNow;
});
```

## Performance Comparison

Bun test is significantly faster:

```bash
# Jest
npm test  # ~15 seconds for 100 tests

# Bun
bun test  # ~2 seconds for 100 tests
```

**7-10x faster execution!**

## Migration Checklist

- [ ] Update imports (`@jest/globals` → `bun:test`)
- [ ] Replace `jest.fn()` with `mock()`
- [ ] Replace `jest.spyOn()` with `spyOn()`
- [ ] Remove Jest config files
- [ ] Create `bunfig.toml`
- [ ] Update package.json scripts
- [ ] Remove Jest dependencies
- [ ] Run tests to verify
- [ ] Update CI/CD pipelines
- [ ] Update documentation
