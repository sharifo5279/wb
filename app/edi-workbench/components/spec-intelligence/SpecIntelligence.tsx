'use client';

import { useState, useRef, useCallback } from 'react';
import type { SpecExtraction } from '@/src/lib/edi/spec-types';
import { UploadZone } from './UploadZone';
import { LoadingCard } from './LoadingCard';
import { ErrorCard } from './ErrorCard';
import { ResultsView } from './ResultsView';

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase = 'empty' | 'loading' | 'error' | 'results';

// ─── SSE event shapes from the extract endpoint ───────────────────────────────

interface DeltaEvent  { type: 'delta';  text: string; }
interface DoneEvent   { type: 'done';   extraction: SpecExtraction; }
interface ErrorEvent  { type: 'error';  message: string; }
type SSEEvent = DeltaEvent | DoneEvent | ErrorEvent;

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * SpecIntelligence — root component for the Spec Intelligence workbench tab.
 *
 * Manages a simple state machine:
 *
 *   empty → loading → results
 *                  ↘ error
 *   (any) → empty  via Cancel / Re-upload
 *
 * State:
 *   phase       — current phase
 *   extraction  — SpecExtraction once done
 *   statusLog   — completed status lines shown in LoadingCard
 *   errorMessage — error text shown in ErrorCard
 *   filename    — PDF filename for display
 *   abortRef    — AbortController for the active fetch
 *   logBufRef   — partial line buffer for status log splitting
 */
export function SpecIntelligence() {
  const [phase,        setPhase]        = useState<Phase>('empty');
  const [extraction,   setExtraction]   = useState<SpecExtraction | null>(null);
  const [statusLog,    setStatusLog]    = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [filename,     setFilename]     = useState('');

  const abortRef  = useRef<AbortController | null>(null);
  /** Partial line buffer — holds text after the last '\n' until more data arrives. */
  const logBufRef = useRef('');

  // ── Core streaming handler ─────────────────────────────────────────────────

  /**
   * Initiates a spec extraction for the given PDF file.
   * Transitions: empty/error/results → loading → results | error.
   */
  const handleFileAccepted = useCallback(async (file: File) => {
    // Abort any in-flight request
    abortRef.current?.abort();

    // Reset state
    setFilename(file.name);
    setStatusLog([]);
    setErrorMessage('');
    setExtraction(null);
    setPhase('loading');
    logBufRef.current = '';

    const abort = new AbortController();
    abortRef.current = abort;

    // Build multipart form data
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/edi-workbench/spec-intelligence/extract', {
        method: 'POST',
        body: formData,
        signal: abort.signal,
      });

      if (!res.ok || !res.body) {
        let msg = `HTTP ${res.status}`;
        try {
          const body = await res.json() as { error?: string };
          if (body.error) msg = body.error;
        } catch { /* ignore */ }
        setErrorMessage(msg);
        setPhase('error');
        return;
      }

      // ── Consume SSE stream ──────────────────────────────────────────────────
      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let evtBuf = ''; // SSE line buffer

      outer: while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        evtBuf += decoder.decode(value, { stream: true });
        const lines = evtBuf.split('\n');
        evtBuf = lines.pop()!; // keep last partial line

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const json = line.slice(6).trim();
          if (!json) continue;

          let event: SSEEvent;
          try {
            event = JSON.parse(json) as SSEEvent;
          } catch {
            continue; // ignore malformed SSE
          }

          if (event.type === 'delta') {
            // Append text to the log buffer, splitting completed lines
            logBufRef.current += event.text;
            const parts = logBufRef.current.split('\n');
            // All but the last part are complete lines
            const completed = parts.slice(0, -1).map((s) => s.trim()).filter(Boolean);
            logBufRef.current = parts[parts.length - 1] ?? '';
            if (completed.length > 0) {
              setStatusLog((prev) => {
                // Merge: drop last item if it's the pending partial we're replacing,
                // then add all completed lines plus the new partial tail.
                const tail = logBufRef.current.trim();
                const next = [...prev, ...completed];
                return tail ? [...next, tail] : next;
              });
            } else {
              // No newline yet — update the last "pending" line in the log
              const tail = logBufRef.current.trim();
              if (tail) {
                setStatusLog((prev) => {
                  // Replace the last item if it was already a partial, else append
                  if (prev.length === 0) return [tail];
                  const allButLast = prev.slice(0, -1);
                  return [...allButLast, tail];
                });
              }
            }
          } else if (event.type === 'done') {
            setExtraction(event.extraction);
            setPhase('results');
            break outer;
          } else if (event.type === 'error') {
            setErrorMessage(event.message ?? 'An unknown error occurred during extraction.');
            setPhase('error');
            break outer;
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        // User cancelled — go back to empty
        setPhase('empty');
      } else {
        setErrorMessage((err as Error).message ?? 'Connection failed. Please try again.');
        setPhase('error');
      }
    }
  }, []);

  // ── Cancel (loading → empty) ───────────────────────────────────────────────
  const handleCancel = useCallback(() => {
    abortRef.current?.abort();
    // Phase update happens in the AbortError catch branch above
  }, []);

  // ── Re-upload (error/results → empty) ─────────────────────────────────────
  const handleReupload = useCallback(() => {
    abortRef.current?.abort();
    setPhase('empty');
    setExtraction(null);
    setStatusLog([]);
    setErrorMessage('');
    setFilename('');
    logBufRef.current = '';
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="si-workspace">
      {phase === 'empty' && (
        <UploadZone onFileAccepted={handleFileAccepted} />
      )}

      {phase === 'loading' && (
        <LoadingCard
          filename={filename}
          statusLog={statusLog}
          onCancel={handleCancel}
        />
      )}

      {phase === 'error' && (
        <ErrorCard
          message={errorMessage}
          onReupload={handleReupload}
        />
      )}

      {phase === 'results' && extraction && (
        <ResultsView
          extraction={extraction}
          filename={filename}
          onReupload={handleReupload}
        />
      )}
    </div>
  );
}
