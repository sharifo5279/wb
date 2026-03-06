import Anthropic from '@anthropic-ai/sdk';
import { NextRequest } from 'next/server';

const client = new Anthropic();

/**
 * POST /api/edi-workbench/ai/stream
 *
 * Proxies a chat request to Anthropic Claude and streams the response
 * as Server-Sent Events (SSE) to the browser.
 *
 * Request body:
 *   { messages: [{ role: 'user' | 'assistant', content: string }], system?: string }
 *
 * Stream events:
 *   data: {"type":"delta","text":"..."}
 *   data: {"type":"done"}
 *
 * Error responses:
 *   400 — missing or malformed messages
 *   502 — Anthropic API error
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { messages, system } = body as {
    messages?: { role: string; content: string }[];
    system?: string;
  };

  if (
    !Array.isArray(messages) ||
    messages.length === 0 ||
    messages.some(
      (m) =>
        typeof m !== 'object' ||
        m === null ||
        !['user', 'assistant'].includes(m.role) ||
        typeof m.content !== 'string',
    )
  ) {
    return new Response(
      JSON.stringify({ error: 'messages must be a non-empty array of {role, content} objects' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };

      try {
        const anthropicStream = await client.messages.stream({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 4096,
          ...(system ? { system } : {}),
          messages: messages as Anthropic.Messages.MessageParam[],
        });

        for await (const event of anthropicStream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            send({ type: 'delta', text: event.delta.text });
          }
        }

        send({ type: 'done' });
      } catch (err) {
        const message =
          err instanceof Anthropic.APIError
            ? `Anthropic API error ${err.status}: ${err.message}`
            : 'Upstream error';
        send({ type: 'error', message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
