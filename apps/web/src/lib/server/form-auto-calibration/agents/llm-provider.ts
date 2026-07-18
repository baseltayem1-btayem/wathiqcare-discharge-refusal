/**
 * LLM provider abstraction.
 *
 * Defines a minimal provider interface for agentic tasks. The default
 * implementation can call any OpenAI-compatible API. A no-op / deterministic
 * fallback is provided for tests and offline use.
 */

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type LLMResponse = {
  text: string;
  usage?: { promptTokens?: number; completionTokens?: number };
};

export interface LLMProvider {
  complete(messages: ChatMessage[], options?: { temperature?: number; maxTokens?: number }): Promise<LLMResponse>;
}

export class NoopLLMProvider implements LLMProvider {
  constructor(private fallbackResponse = "{}") {}

  async complete(): Promise<LLMResponse> {
    return { text: this.fallbackResponse };
  }
}

export class OpenAICompatibleProvider implements LLMProvider {
  constructor(
    private apiKey: string,
    private baseUrl: string,
    private model: string,
  ) {}

  async complete(
    messages: ChatMessage[],
    options?: { temperature?: number; maxTokens?: number },
  ): Promise<LLMResponse> {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: options?.temperature ?? 0.2,
        max_tokens: options?.maxTokens ?? 2048,
      }),
    });

    if (!res.ok) {
      throw new Error(`LLM request failed: ${res.status} ${await res.text()}`);
    }

    const json = await res.json();
    const text = json.choices?.[0]?.message?.content ?? "";
    return {
      text,
      usage: json.usage,
    };
  }
}
