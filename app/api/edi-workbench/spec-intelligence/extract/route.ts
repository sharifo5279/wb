/**
 * POST /api/edi-workbench/spec-intelligence/extract
 *
 * Accepts a PDF implementation guide (multipart/form-data, field name "file",
 * max 10 MB) and streams a SpecExtraction via Server-Sent Events.
 *
 * SSE event format (identical to /api/edi-workbench/ai/stream):
 *   data: {"type":"delta","text":"..."}        — streaming status log line
 *   data: {"type":"done","extraction":{…}}     — final SpecExtraction JSON
 *   data: {"type":"error","message":"..."}     — on failure
 *
 * Claude outputs a human-readable status log followed by a JSON block
 * delimited by ---EXTRACTION-START--- / ---EXTRACTION-END--- markers.
 * The server streams text deltas while accumulating the full response,
 * then parses and validates the JSON before sending the done event.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { SpecExtraction } from '@/src/lib/edi/spec-types';

const client = new Anthropic();

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

// ─── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an EDI implementation guide analyst. Your task is to analyze a trading partner's EDI implementation guide PDF and extract a structured specification.

Output format:
1. First, write a human-readable status log describing your analysis progress. Each status line MUST end with a newline character. Use clear, professional language. Example lines:
   "Identifying EDI standard and transaction sets...\n"
   "Extracting segment requirements and usage notes...\n"
   "Parsing element-level requirements...\n"
   "Extracting business rules and conditional logic...\n"
   "Compiling code lists and accepted values...\n"
   "Finalizing extraction...\n"

2. After the status log, output EXACTLY this delimiter on its own line:
   ---EXTRACTION-START---

3. Then output a single valid JSON object matching this TypeScript interface:
   {
     "standard": "X12" | "EDIFACT" | "Unknown",
     "source_filename": "<filename from context>",
     "extracted_at": "<ISO-8601 timestamp>",
     "items": [
       {
         "type": "segment" | "rule" | "code_list" | "note",
         "id": "<short identifier>",
         "summary": "<one-line description, max 120 chars>",
         "detail": "<full description with newlines allowed>"
       }
     ]
   }

4. After the JSON, output EXACTLY this delimiter on its own line:
   ---EXTRACTION-END---

Rules:
- The JSON must be complete and valid. Do not truncate it.
- "type": "segment" — for segment-level requirements (e.g. CLM, NM1, REF)
- "type": "rule" — for business rules, conditional logic, situational notes
- "type": "code_list" — for qualifier codes, accepted values, code tables
- "type": "note" — for general notes, definitions, or trading partner-specific requirements
- Extract as many items as needed to fully represent the implementation guide. Aim for completeness.
- Never embed the JSON inside the status log section.
- Set "extracted_at" to the current UTC time in ISO-8601 format.`;

// ─── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  // ── 1. Validate content type ──────────────────────────────────────────────
  const contentType = req.headers.get('content-type') ?? '';
  if (!contentType.includes('multipart/form-data')) {
    return Response.json(
      { error: 'Request must be multipart/form-data' },
      { status: 400 },
    );
  }

  // ── 2. Parse and validate the uploaded file ───────────────────────────────
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return Response.json({ error: 'Failed to parse form data' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return Response.json(
      { error: 'Missing required field: file' },
      { status: 400 },
    );
  }

  if (file.type !== 'application/pdf') {
    return Response.json(
      { error: 'Only PDF files are accepted' },
      { status: 400 },
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return Response.json(
      { error: 'File exceeds the 10 MB size limit' },
      { status: 400 },
    );
  }

  const filename = file.name;

  // ── 3. Convert PDF to base64 ──────────────────────────────────────────────
  const buffer = await file.arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');

  // ── 4. Build SSE streaming response ──────────────────────────────────────
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload: object) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(payload)}\n\n`),
        );
      };

      let accum = '';

      try {
        const anthropicStream = client.messages.stream({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 8192,
          system: SYSTEM_PROMPT,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'document',
                  source: {
                    type: 'base64',
                    media_type: 'application/pdf',
                    data: base64,
                  },
                } as Anthropic.Messages.RequestDocumentBlock,
                {
                  type: 'text',
                  text: `Please analyze this EDI implementation guide PDF (filename: "${filename}") and extract the specification according to your instructions.`,
                },
              ],
            },
          ],
        });

        for await (const event of anthropicStream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            const chunk = event.delta.text;
            accum += chunk;
            // Stream the raw text chunk to the client for the status log display.
            // The client splits on '\n' to render individual log lines.
            send({ type: 'delta', text: chunk });
          }
        }

        // ── 5. Parse the extraction JSON from the accumulated response ────────
        const startMarker = '---EXTRACTION-START---';
        const endMarker   = '---EXTRACTION-END---';
        const startIdx = accum.indexOf(startMarker);
        const endIdx   = accum.indexOf(endMarker);

        if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
          send({
            type: 'error',
            message:
              'Claude did not produce a parseable extraction block. The PDF may not be a valid EDI implementation guide.',
          });
          controller.close();
          return;
        }

        const jsonStr = accum
          .slice(startIdx + startMarker.length, endIdx)
          .trim();

        let extraction: SpecExtraction;
        try {
          extraction = JSON.parse(jsonStr) as SpecExtraction;
        } catch (parseErr) {
          send({
            type: 'error',
            message: `Failed to parse extraction JSON: ${(parseErr as Error).message}`,
          });
          controller.close();
          return;
        }

        // Ensure source_filename matches the uploaded file in case Claude
        // used a different string.
        extraction.source_filename = filename;

        send({ type: 'done', extraction });
      } catch (err) {
        const apiErr = err as { status?: number; message?: string };
        if (apiErr.status) {
          send({
            type: 'error',
            message: `Anthropic API error ${apiErr.status}: ${apiErr.message ?? 'Unknown'}`,
          });
        } else {
          send({
            type: 'error',
            message: `Extraction failed: ${(err as Error).message ?? 'Unknown error'}`,
          });
        }
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
