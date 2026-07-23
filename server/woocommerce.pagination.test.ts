import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchWooOrders } from "./woocommerce";

function order(id: number) {
  return {
    id,
    status: "completed",
    date_created: "2026-07-22T12:00:00.000Z",
    billing: { first_name: "Test", last_name: "Customer", email: `customer${id}@example.com` },
    line_items: [{ name: "Example product" }],
  };
}

describe("WooCommerce order pagination", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetches every reported page with bounded 100-row requests", async () => {
    const firstPage = Array.from({ length: 100 }, (_, index) => order(index + 1));
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(firstPage), {
        status: 200,
        headers: { "content-type": "application/json", "x-wp-totalpages": "2" },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify([order(101)]), {
        status: 200,
        headers: { "content-type": "application/json", "x-wp-totalpages": "2" },
      }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchWooOrders("https://store.example.com/", "ck_test", "cs_test", 30);

    expect(result).toHaveLength(101);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [firstUrl, firstInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    const [secondUrl] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(firstUrl).toContain("per_page=100");
    expect(firstUrl).toContain("page=1");
    expect(secondUrl).toContain("page=2");
    expect(firstInit.redirect).toBe("error");
    expect((firstInit.headers as Record<string, string>).Authorization).toBe(`Basic ${Buffer.from("ck_test:cs_test").toString("base64")}`);
  });

  it("stops after one short page when the total-page header is unavailable", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify([order(1)]), {
      status: 200,
      headers: { "content-type": "application/json" },
    }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchWooOrders("https://store.example.com", "ck_test", "cs_test", 7)).resolves.toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
