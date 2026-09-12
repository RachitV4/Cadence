import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, FileText, Loader2 } from 'lucide-react';
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist';

interface InteractiveDocumentVisualizationProps {
  fileUrl: string | null;
  fileName: string;
  pageCount: number;
  activePage: number;
  sourceText?: string;
  onPageChange: (page: number) => void;
}

interface HighlightRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface PdfTextItem {
  str?: unknown;
  transform?: number[];
  width?: number;
  height?: number;
}

const normalizeForMatch = (value: string) => value
  .toLowerCase()
  .replace(/[“”"']/g, '')
  .replace(/\s+/g, ' ')
  .trim();

export function InteractiveDocumentVisualization({
  fileUrl,
  fileName,
  pageCount,
  activePage,
  sourceText,
  onPageChange,
}: InteractiveDocumentVisualizationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);

  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [loadedPages, setLoadedPages] = useState(pageCount || 1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [highlightActive, setHighlightActive] = useState(false);
  const highlightTimeoutRef = useRef<number | undefined>(undefined);

  const isPdf = fileName.toLowerCase().endsWith('.pdf');

  useEffect(() => {
    let cancelled = false;

    async function loadPdf() {
      setPdf(null);
      setError('');

      if (!fileUrl || !isPdf) {
        return;
      }

      setLoading(true);

      try {
        const pdfjs = await import('pdfjs-dist');
        const pdfWorker = await import(
          'pdfjs-dist/build/pdf.worker.min.mjs?url'
        );

        pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker.default;

        const document = await pdfjs.getDocument({
          url: fileUrl,
        }).promise;

        if (cancelled) {
          return;
        }

        setPdf(document);
        setLoadedPages(document.numPages);
      } catch {
        if (!cancelled) {
          setError(
            'Cadence could not preview this PDF. You can still use the extracted source text to verify it.'
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadPdf();

    return () => {
      cancelled = true;
    };
  }, [fileUrl, isPdf]);

  useEffect(() => {
    let renderTask: RenderTask | undefined;

    async function renderPage() {
      if (!pdf || !canvasRef.current) {
        return;
      }

      setLoading(true);

      try {
        const page = await pdf.getPage(
          Math.min(Math.max(activePage, 1), loadedPages)
        );

        const viewport = page.getViewport({
          scale: 1.35,
        });

        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        if (!context) {
          return;
        }

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const task = page.render({
          canvas,
          canvasContext: context,
          viewport,
        });

        renderTask = task;

        await task.promise;

        window.clearTimeout(highlightTimeoutRef.current);
        const sourceToHighlight = sourceText?.trim() || '';
        if (!sourceToHighlight) return;

        const textContent = await page.getTextContent();
        const entries = (textContent.items as PdfTextItem[])
          .map((item) => ({
            item,
            text: typeof item.str === 'string' ? normalizeForMatch(item.str) : '',
          }))
          .filter(({ text, item }) => text && item.transform && item.transform.length >= 6);
        const query = normalizeForMatch(sourceToHighlight);
        const combinedText = entries.map(({ text }) => text).join(' ');
        const matchStart = combinedText.indexOf(query);
        const matchEnd = matchStart + query.length;
        const distinctiveWords = new Set(
          query.split(/[^a-z0-9]+/).filter((word) => word.length >= 5),
        );
        let cursor = 0;

        const matchedEntries = entries.filter(({ text }) => {
          const start = cursor;
          cursor += text.length + 1;
          if (matchStart >= 0) return cursor > matchStart && start < matchEnd;
          return text
            .split(/[^a-z0-9]+/)
            .some((word) => distinctiveWords.has(word));
        });

        const rects = matchedEntries.map(({ item }) => {
          const transform = item.transform!;
          const [left, baseline] = viewport.convertToViewportPoint(transform[4], transform[5]);
          const height = Math.max((item.height || Math.hypot(transform[2], transform[3])) * viewport.scale, 10);
          const width = Math.max((item.width || 12) * viewport.scale, 12);

          return {
            left: (left / viewport.width) * 100,
            top: (Math.max(0, baseline - height) / viewport.height) * 100,
            width: (width / viewport.width) * 100,
            height: (height / viewport.height) * 100,
          };
        });

        if (highlightActive && rects.length) {
          context.save();
          context.fillStyle = 'rgba(253, 224, 71, 0.62)';
          rects.forEach((rect) => {
            context.fillRect(
              (rect.left / 100) * viewport.width,
              (rect.top / 100) * viewport.height,
              (rect.width / 100) * viewport.width,
              (rect.height / 100) * viewport.height,
            );
          });
          context.restore();
          highlightTimeoutRef.current = window.setTimeout(() => setHighlightActive(false), 3_000);
        }
      } catch (renderError: unknown) {
        if (!(renderError instanceof Error && renderError.name === 'RenderingCancelledException')) {
          setError('Unable to render this page.');
        }
      } finally {
        setLoading(false);
      }
    }

    renderPage();

    return () => {
      renderTask?.cancel();
    };
  }, [pdf, activePage, loadedPages, sourceText, highlightActive]);

  useEffect(() => {
    if (sourceText?.trim()) {
      setHighlightActive(true);
      viewerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activePage, sourceText]);

  useEffect(() => () => window.clearTimeout(highlightTimeoutRef.current), []);

  const totalPages = loadedPages || pageCount || 1;

  const goToPage = (page: number) => {
    onPageChange(
      Math.min(Math.max(page, 1), totalPages)
    );
  };

  return (
    <section className="card overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-cadence-border px-4 py-3">
        <div className="min-w-0">
          <p className="text-xs font-mono uppercase tracking-wider text-cadence-muted">
            Document verification
          </p>

          <p className="truncate text-sm font-medium text-cadence-text">
            {fileName || 'Select a contract to preview'}
          </p>
        </div>

        {fileUrl && (
          <div className="flex items-center gap-1 rounded-lg border border-cadence-border bg-cadence-surface2 p-1">
            <button
              className="btn-ghost h-7 w-7 !p-0"
              onClick={() => goToPage(activePage - 1)}
              disabled={activePage <= 1}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <span className="min-w-16 text-center text-xs font-mono text-cadence-secondary">
              {activePage} / {totalPages}
            </span>

            <button
              className="btn-ghost h-7 w-7 !p-0"
              onClick={() => goToPage(activePage + 1)}
              disabled={activePage >= totalPages}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <div ref={viewerRef} className="relative flex min-h-[560px] items-start justify-center overflow-auto bg-cadence-surface2 p-4 scrollbar-thin">
        {!fileUrl ? (
          <div className="flex h-[520px] flex-col items-center justify-center text-center text-cadence-muted">
            <FileText className="mb-3 h-9 w-9" />

            <p className="text-sm">
              Select or upload a contract to verify its extracted details.
            </p>
          </div>
        ) : !isPdf ? (
          <div className="w-full self-center rounded-lg bg-cadence-surface p-5 text-center text-sm text-cadence-secondary">
            Visual preview is currently available for PDFs. The extracted
            findings can still be verified by page and source text.
          </div>
        ) : error ? (
          <div className="w-full self-center rounded-lg bg-cadence-dangerSoft p-5 text-center text-sm text-cadence-danger">
            {error}
          </div>
        ) : (
          <>
            <canvas
              ref={canvasRef}
              className="block max-w-full rounded-sm bg-white shadow-sm"
            />

            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-cadence-surface2/70">
                <Loader2 className="h-6 w-6 animate-spin text-cadence-accent" />
              </div>
            )}
          </>
        )}
      </div>

      {sourceText && (
        <div className="border-t border-cadence-accentLine bg-cadence-accentSoft px-4 py-3">
          <p className="mb-1 text-xs font-mono uppercase tracking-wider text-cadence-accent">
            Source on this page
          </p>

          <p className="text-xs leading-relaxed text-cadence-secondary">
            “{sourceText}”
          </p>
        </div>
      )}
    </section>
  );
}
