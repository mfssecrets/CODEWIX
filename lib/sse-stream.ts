/**
 * Lightweight SSE chat-completion stream parser.
 *
 * Usage:
 *   import { parseSSEStream } from "@/lib/sse-stream";
 *   parseSSEStream(readableStream)
 *     .on("content", (delta, fullContent) => { ... })
 *     .on("finalContent", (fullText) => { ... });
 */

type EventHandler = (...args: any[]) => void;

class SSEChatStream {
  private accumulatedContent = "";
  private handlers: Record<string, EventHandler[]> = {};

  on(event: string, handler: EventHandler): this {
    (this.handlers[event] ??= []).push(handler);
    return this;
  }

  private emit(event: string, ...args: unknown[]) {
    for (const h of this.handlers[event] ?? []) {
      h(...args);
    }
  }

  /**
   * Parse an SSE ReadableStream and emit "content" and "finalContent" events.
   */
  static fromReadableStream(stream: ReadableStream<Uint8Array>): SSEChatStream {
    const parser = new SSEChatStream();

    (async () => {
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      try {
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
                parser.accumulatedContent += delta;
                parser.emit("content", delta, parser.accumulatedContent);
              }
            } catch {
              // Skip malformed JSON chunks
            }
          }
        }

        // Process remaining buffer
        if (buffer.trim()) {
          const trimmed = buffer.trim();
          if (trimmed.startsWith("data: ")) {
            const data = trimmed.slice(6);
            if (data !== "[DONE]") {
              try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices?.[0]?.delta?.content;
                if (delta) {
                  parser.accumulatedContent += delta;
                  parser.emit("content", delta, parser.accumulatedContent);
                }
              } catch {
                // Skip
              }
            }
          }
        }

        parser.emit("finalContent", parser.accumulatedContent);
      } catch {
        // Stream ended or errored — still emit what we have
        parser.emit("finalContent", parser.accumulatedContent);
      }
    })();

    return parser;
  }
}

export function parseSSEStream(
  stream: ReadableStream<Uint8Array>,
): SSEChatStream {
  return SSEChatStream.fromReadableStream(stream);
}

export default SSEChatStream;
