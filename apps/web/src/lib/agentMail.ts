import type { JsonValue } from "./json";

export type AgentMailConfig = {
  baseUrl: string;
  path: string;
  bearerToken?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export class AgentMailClient {
  private readonly config: AgentMailConfig;

  constructor(config?: Partial<AgentMailConfig>) {
    const baseUrl = (config?.baseUrl ?? process.env.AGENT_MAIL_BASE_URL ?? "http://127.0.0.1:8765").replace(
      /\/+$/,
      "",
    );
    const rawPath = config?.path ?? process.env.AGENT_MAIL_PATH ?? "/mcp/";
    const path = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
    const bearerToken = config?.bearerToken ?? process.env.AGENT_MAIL_BEARER_TOKEN;
    this.config = { baseUrl, path, bearerToken };
  }

  private endpoint(): string {
    const p = this.config.path.endsWith("/") ? this.config.path : `${this.config.path}/`;
    return `${this.config.baseUrl}${p}`;
  }

  async call(method: string, params?: JsonValue): Promise<JsonValue> {
    const id = crypto.randomUUID();
    const body = JSON.stringify({ jsonrpc: "2.0", id, method, params: params ?? {} });

    const headers: Record<string, string> = {
      Accept: "application/json, text/event-stream",
      "Content-Type": "application/json",
    };
    if (this.config.bearerToken) headers.Authorization = `Bearer ${this.config.bearerToken}`;

    const res = await fetch(this.endpoint(), { method: "POST", headers, body });
    const text = await res.text();
    let data: unknown = undefined;
    try {
      data = text ? (JSON.parse(text) as unknown) : undefined;
    } catch {
      throw new Error(`Agent Mail non-JSON response (HTTP ${res.status}): ${text.slice(0, 400)}`);
    }

    if (!res.ok) throw new Error(`Agent Mail HTTP ${res.status}: ${JSON.stringify(data)}`);
    if (!isRecord(data)) throw new Error(`Agent Mail malformed JSON: ${JSON.stringify(data)}`);
    if ("error" in data && data.error) throw new Error(`Agent Mail MCP error: ${JSON.stringify(data.error)}`);
    return ("result" in data ? (data.result as JsonValue) : null) satisfies JsonValue;
  }

  toolsList(): Promise<JsonValue> {
    return this.call("tools/list", {});
  }

  toolsCall(name: string, args: Record<string, JsonValue>): Promise<JsonValue> {
    return this.call("tools/call", { name, arguments: args });
  }

  resourcesRead(uri: string): Promise<JsonValue> {
    return this.call("resources/read", { uri });
  }
}
