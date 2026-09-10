export type WebMcpToolDefinition = {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations: { readOnlyHint: boolean; openWorldHint: boolean };
  execute: (input: Record<string, never>) => Promise<Record<string, unknown>>;
};

export type BrowserModelContext = {
  registerTool: (
    tool: WebMcpToolDefinition,
    options?: { signal?: AbortSignal }
  ) => Promise<void> | void;
};

declare global {
  interface Navigator {
    modelContext?: BrowserModelContext;
  }

  interface Document {
    modelContext?: BrowserModelContext;
  }
}

export function getPublicProductInformation(): Record<string, unknown> {
  return {
    product: "Get Phame",
    description: "Compliance-aware individual customer feedback outreach.",
    resources: {
      home: "https://getphame.app/",
      developerDocumentation: "https://getphame.app/docs/api",
      openApi: "https://getphame.app/openapi.json",
      authentication: "https://getphame.app/auth.md",
      security: "https://getphame.app/security",
      privacy: "https://getphame.app/privacy-policy",
    },
    safety: {
      customerData: "Not available through this public browser tool.",
      consequentialActions: "Not available through this public browser tool.",
      protectedApi:
        "Requires an account-owner-provisioned, scoped developer API key.",
    },
  };
}

export function createPublicDiscoveryTool(): WebMcpToolDefinition {
  return {
    name: "get_phame_public_product_information",
    title: "Get Phame public product information",
    description:
      "Returns public Get Phame product, developer documentation, authentication, privacy, and security resources. It does not access customer data or perform actions.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {},
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
    execute: async () => getPublicProductInformation(),
  };
}

export function getBrowserModelContext(): BrowserModelContext | undefined {
  if (typeof window === "undefined") return undefined;
  return navigator.modelContext ?? document.modelContext;
}

export function registerPublicDiscoveryTool(
  context: BrowserModelContext,
  signal: AbortSignal
) {
  return context.registerTool(createPublicDiscoveryTool(), { signal });
}
