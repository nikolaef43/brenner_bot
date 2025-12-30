import type { JsonValue } from "./json";

export type AgentMailConfig = {
  baseUrl: string;
  path: string;
  bearerToken?: string;
};

export type AgentMailImportance = "normal" | "high" | "urgent";

export type AgentMailCommitInfo = {
  hexsha: string;
  summary: string;
  authored_ts: string;
  insertions: number;
  deletions: number;
  diff_summary?: {
    hunks: number;
    excerpt?: string[];
  };
};

export type AgentMailMessage = {
  id: number;
  project_id?: number;
  sender_id?: number;
  thread_id: string | null;
  subject: string;
  importance?: AgentMailImportance;
  ack_required?: boolean;
  created_ts: string;
  attachments?: unknown[];
  body_md?: string;
  from?: string;
  to?: string[];
  cc?: string[];
  bcc?: string[];
  kind?: "to" | "cc" | "bcc" | "from" | string;
  commit?: AgentMailCommitInfo | null;
};

export type AgentMailInbox = {
  project: string;
  agent: string;
  count: number;
  messages: AgentMailMessage[];
};

export type AgentMailThread = {
  project: string;
  thread_id: string;
  messages: AgentMailMessage[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readFirstResourceText(result: JsonValue): string {
  if (!isRecord(result)) throw new Error(`Agent Mail malformed resources/read response: ${JSON.stringify(result)}`);

  const contents = result.contents;
  if (!Array.isArray(contents) || contents.length === 0) {
    throw new Error(`Agent Mail resources/read response missing contents: ${JSON.stringify(result)}`);
  }

  const first = contents[0];
  if (!isRecord(first) || typeof first.text !== "string") {
    throw new Error(`Agent Mail resources/read response missing first.text: ${JSON.stringify(result)}`);
  }

  return first.text;
}

function parseResourceJson<T>(result: JsonValue): T {
  const text = readFirstResourceText(result);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Agent Mail resources/read returned non-JSON text: ${text.slice(0, 400)}`);
  }
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

  private resourceUri(path: string, query?: Record<string, string | number | boolean | null | undefined>): string {
    const url = new URL(`resource://${path}`);
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value === undefined || value === null) continue;
      url.searchParams.set(key, String(value));
    }
    return url.toString();
  }

  async readInbox(args: {
    projectKey: string;
    agentName: string;
    limit?: number;
    urgentOnly?: boolean;
    includeBodies?: boolean;
    sinceTs?: string;
  }): Promise<AgentMailInbox> {
    const uri = this.resourceUri(`inbox/${args.agentName}`, {
      project: args.projectKey,
      limit: args.limit ?? 20,
      urgent_only: args.urgentOnly ?? false,
      include_bodies: args.includeBodies ?? false,
      since_ts: args.sinceTs,
    });
    const result = await this.resourcesRead(uri);
    return parseResourceJson<AgentMailInbox>(result);
  }

  async readThread(args: { projectKey: string; threadId: string; includeBodies?: boolean }): Promise<AgentMailThread> {
    const uri = this.resourceUri(`thread/${args.threadId}`, {
      project: args.projectKey,
      include_bodies: args.includeBodies ?? false,
    });
    const result = await this.resourcesRead(uri);
    return parseResourceJson<AgentMailThread>(result);
  }

  async markMessageRead(args: { projectKey: string; agentName: string; messageId: number }): Promise<JsonValue> {
    return this.toolsCall("mark_message_read", {
      project_key: args.projectKey,
      agent_name: args.agentName,
      message_id: args.messageId,
    });
  }

  async acknowledgeMessage(args: {
    projectKey: string;
    agentName: string;
    messageId: number;
  }): Promise<JsonValue> {
    return this.toolsCall("acknowledge_message", {
      project_key: args.projectKey,
      agent_name: args.agentName,
      message_id: args.messageId,
    });
  }
}
