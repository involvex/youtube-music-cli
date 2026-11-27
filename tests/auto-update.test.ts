import { describe, expect, it } from "bun:test";

import { getAutoUpdateService } from "../source/services/config/auto-update.service.ts";

describe("AutoUpdateService", () => {
  it("should validate version format correctly and reject malformed versions immediately", async () => {
    const service = getAutoUpdateService();
    const result = await service.update("invalid;rm -rf /");
    expect(result.success).toBe(false);
    expect(result.message).toContain("Invalid target version format");
  });
});
