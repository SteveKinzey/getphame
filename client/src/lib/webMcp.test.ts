import { describe, expect, it, vi } from "vitest";
import {
  createPublicDiscoveryTool,
  getPublicProductInformation,
  registerPublicDiscoveryTool,
} from "./webMcp";

describe("Get Phame WebMCP public discovery", () => {
  it("registers one read-only discovery tool with abort-based cleanup support", async () => {
    const registerTool = vi.fn().mockResolvedValue(undefined);
    const controller = new AbortController();

    await registerPublicDiscoveryTool({ registerTool }, controller.signal);

    expect(registerTool).toHaveBeenCalledTimes(1);
    expect(registerTool.mock.calls[0][0]).toMatchObject({
      name: "get_phame_public_product_information",
      annotations: { readOnlyHint: true, openWorldHint: false },
    });
    expect(registerTool.mock.calls[0][1]).toEqual({ signal: controller.signal });
  });

  it("returns only public resources and does not offer customer data or actions", async () => {
    const tool = createPublicDiscoveryTool();
    const result = await tool.execute({});

    expect(result).toEqual(getPublicProductInformation());
    expect(JSON.stringify(result)).toContain("Not available through this public browser tool");
    expect(tool.description).toContain("does not access customer data or perform actions");
  });
});
