/**
 * Z.AI API client — drop-in replacement for the Together AI SDK.
 *
 * Uses the Z.AI OpenAI-compatible chat completions endpoint so all
 * existing call sites only need to swap the import.
 *
 * Environment variable: ZAI_API_KEY
 */

export const ZAI_API_BASE =
  process.env.ZAI_API_BASE ?? "https://api.z-ai.cn/v1";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string | ContentPart[];
};

type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

type CompletionParams = {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  reasoning?: { enabled: boolean };
  chat_template_kwargs?: Record<string, unknown>;
};

type CompletionChoice = {
  message: { role: string; content: string | null };
  finish_reason: string | null;
};

type CompletionUsage = {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
};

type CompletionResponse = {
  id: string;
  choices: CompletionChoice[];
  usage?: CompletionUsage;
};

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

function headers(): Record<string, string> {
  const key = process.env.ZAI_API_KEY;
  if (!key) {
    throw new Error(
      "ZAI_API_KEY is not set. Please set it in your environment.",
    );
  }
  return {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

// ------------------------------------------------------------------
// ZAI class — mirrors the Together SDK surface used in this codebase
// ------------------------------------------------------------------

export class ZAI {
  public chat = {
    completions: {
      /**
       * Non-streaming chat completion.
       */
      async create(
        params: CompletionParams,
      ): Promise<CompletionResponse> {
        const body: Record<string, unknown> = {
          model: params.model,
          messages: params.messages,
          temperature: params.temperature,
          max_tokens: params.max_tokens,
          stream: false,
        };

        // Strip Together-specific extras that Z.AI doesn't support
        // (reasoning, chat_template_kwargs are Together-specific).
        // If you need reasoning support on Z.AI, add the appropriate
        // parameter mapping here.

        const res = await fetch(`${ZAI_API_BASE}/chat/completions`, {
          method: "POST",
          headers: headers(),
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(
            `Z.AI API error ${res.status}: ${text || res.statusText}`,
          );
        }

        return (await res.json()) as CompletionResponse;
      },

      /**
       * Streaming chat completion — returns an object whose
       * `toReadableStream()` yields SSE data identical to the
       * Together SDK so the existing `ChatCompletionStream.fromReadableStream`
       * consumer in `page.client.tsx` keeps working.
       */
      stream(params: CompletionParams): ZAIStream {
        const body: Record<string, unknown> = {
          model: params.model,
          messages: params.messages,
          temperature: params.temperature,
          max_tokens: params.max_tokens,
          stream: true,
        };

        return new ZAIStream(body);
      },
    },
  };
}

// ------------------------------------------------------------------
// ZAIStream — minimal stream wrapper that produces an SSE readable
// stream compatible with the existing ChatCompletionStream parser.
// ------------------------------------------------------------------

export class ZAIStream {
  private body: Record<string, unknown>;
  private _firstContentCallback: ((delta: string) => void) | null = null;
  private _accumulatedContent = "";
  private _finalContentPromise: Promise<string>;
  private _finalContentResolve!: (value: string) => void;
  private _usagePromise: Promise<CompletionUsage | undefined>;
  private _usageResolve!: (value: CompletionUsage | undefined) => void;
  private _completionPromise: Promise<CompletionResponse | undefined>;
  private _completionResolve!: (value: CompletionResponse | undefined) => void;

  constructor(body: Record<string, unknown>) {
    this.body = body;
    this._finalContentPromise = new Promise<string>((resolve) => {
      this._finalContentResolve = resolve;
    });
    this._usagePromise = new Promise<CompletionUsage | undefined>((resolve) => {
      this._usageResolve = resolve;
    });
    this._completionPromise = new Promise<CompletionResponse | undefined>(
      (resolve) => {
        this._completionResolve = resolve;
      },
    );
  }

  /**
   * Register a callback for incremental content deltas.
   */
  on(event: "content", callback: (delta: string) => void): this {
    if (event === "content") {
      this._firstContentCallback = callback;
    }
    return this;
  }

  /**
   * Resolves with the full accumulated text once the stream ends.
   */
  finalContent(): Promise<string> {
    return this._finalContentPromise;
  }

  /**
   * Resolves with the usage stats once the stream ends.
   */
  async totalUsage(): Promise<CompletionUsage | undefined> {
    return this._usagePromise;
  }

  /**
   * Resolves with the full completion object once the stream ends.
   */
  async finalChatCompletion(): Promise<CompletionResponse | undefined> {
    return this._completionPromise;
  }

  /**
   * Returns a ReadableStream of SSE-formatted data bytes compatible
   * with the `ChatCompletionStream.fromReadableStream()` consumer.
   */
  toReadableStream(): ReadableStream<Uint8Array> {
    const self = this;
    const encoder = new TextEncoder();

    return new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          const res = await fetch(`${ZAI_API_BASE}/chat/completions`, {
            method: "POST",
            headers: headers(),
            body: JSON.stringify(self.body),
          });

          if (!res.ok) {
            const text = await res.text().catch(() => "");
            controller.error(
              new Error(
                `Z.AI API error ${res.status}: ${text || res.statusText}`,
              ),
            );
            return;
          }

          const reader = res.body?.getReader();
          if (!reader) {
            controller.error(new Error("No response body from Z.AI"));
            return;
          }

          const decoder = new TextDecoder();
          let buffer = "";
          let fullContent = "";
          let usage: CompletionUsage | undefined;
          let completion: CompletionResponse | undefined;

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || !trimmed.startsWith("data: ")) continue;

              const data = trimmed.slice(6);
              if (data === "[DONE]") continue;

              try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices?.[0]?.delta?.content;
                if (delta) {
                  fullContent += delta;
                  self._accumulatedContent = fullContent;
                  self._firstContentCallback?.(delta);
                }

                // Capture usage if provided in the final chunk
                if (parsed.usage) {
                  usage = parsed.usage as CompletionUsage;
                }

                // Build a synthetic completion object from the stream
                if (
                  parsed.choices?.[0]?.finish_reason &&
                  !completion
                ) {
                  completion = {
                    id: parsed.id ?? "",
                    choices: [
                      {
                        message: {
                          role: "assistant",
                          content: fullContent,
                        },
                        finish_reason: parsed.choices[0].finish_reason,
                      },
                    ],
                    usage,
                  };
                }
              } catch {
                // Skip malformed JSON chunks
              }

              // Re-emit the SSE line so downstream consumers work unchanged
              controller.enqueue(encoder.encode(line + "\n"));
            }
          }

          // Process any remaining buffer
          if (buffer.trim()) {
            const trimmed = buffer.trim();
            if (trimmed.startsWith("data: ")) {
              const data = trimmed.slice(6);
              if (data !== "[DONE]") {
                try {
                  const parsed = JSON.parse(data);
                  const delta = parsed.choices?.[0]?.delta?.content;
                  if (delta) {
                    fullContent += delta;
                    self._accumulatedContent = fullContent;
                    self._firstContentCallback?.(delta);
                  }
                  if (parsed.usage) {
                    usage = parsed.usage as CompletionUsage;
                  }
                } catch {
                  // Skip
                }
              }
              controller.enqueue(encoder.encode(buffer + "\n"));
            }
          }

          self._finalContentResolve(fullContent);
          self._usageResolve(usage);
          self._completionResolve(completion);
          controller.close();
        } catch (err) {
          self._finalContentResolve(self._accumulatedContent);
          self._usageResolve(undefined);
          self._completionResolve(undefined);
          controller.error(err);
        }
      },
    });
  }
}

// Default export for convenience: `import ZAI from "@/lib/zai";`
export default ZAI;
