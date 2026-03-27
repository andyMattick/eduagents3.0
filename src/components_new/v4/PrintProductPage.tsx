import { useEffect, useMemo, useState } from "react";

import type { IntentProduct } from "../../prism-v4/schema/integration/IntentProduct";
import { ProductViewer, getProductTitle } from "./ProductViewer";
import "./v4.css";

function toTitleCase(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
    .join(" ");
}

function getProductMetadata(product: IntentProduct | null) {
  if (!product) {
    return { subject: null, gradeLabel: null };
  }

  const payload = product.payload as Record<string, unknown>;
  const rawSubject = typeof payload.subject === "string"
    ? payload.subject
    : typeof (product as unknown as Record<string, unknown>).subject === "string"
      ? String((product as unknown as Record<string, unknown>).subject)
      : null;

  const rawGrade = typeof payload.gradeLevel === "string" || typeof payload.gradeLevel === "number"
    ? payload.gradeLevel
    : typeof (product as unknown as Record<string, unknown>).gradeLevel === "string" || typeof (product as unknown as Record<string, unknown>).gradeLevel === "number"
      ? (product as unknown as Record<string, unknown>).gradeLevel
      : null;

  const subject = rawSubject ? toTitleCase(String(rawSubject).replace(/[-_]+/g, " ")) : null;
  const gradeLabel = rawGrade === null
    ? null
    : String(rawGrade).toLowerCase().startsWith("grade")
      ? String(rawGrade)
      : `Grade ${String(rawGrade)}`;

  return { subject, gradeLabel };
}

function getProductIdFromPath(pathname: string) {
  const prefix = "/print/";
  if (!pathname.startsWith(prefix)) {
    return null;
  }

  const productId = pathname.slice(prefix.length).trim();
  return productId.length > 0 ? decodeURIComponent(productId) : null;
}

async function fetchJson<T>(input: string) {
  const response = await fetch(input);
  const rawBody = await response.text();
  const trimmedBody = rawBody.trim();

  if (!trimmedBody) {
    throw new Error(`Empty response from ${input}`);
  }

  let payload: unknown;
  try {
    payload = JSON.parse(trimmedBody);
  } catch {
    throw new Error(`Invalid JSON response from ${input}`);
  }

  if (!response.ok) {
    const errorMessage = typeof payload === "object" && payload !== null && "error" in payload
      ? String((payload as { error?: unknown }).error ?? `Request failed: ${input}`)
      : `Request failed: ${input}`;
    throw new Error(errorMessage);
  }

  return payload as T;
}

export function PrintProductPage() {
  const [product, setProduct] = useState<IntentProduct | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAnswerGuidance, setShowAnswerGuidance] = useState(false);

  const productId = useMemo(() => getProductIdFromPath(window.location.pathname), []);

  useEffect(() => {
    let isCancelled = false;

    async function loadProduct() {
      if (!productId) {
        setError("Print view requires a product ID.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const nextProduct = await fetchJson<IntentProduct>(`/api/v4/documents/intent?productId=${encodeURIComponent(productId)}`);
        if (!isCancelled) {
          setProduct(nextProduct);
        }
      } catch (loadError) {
        if (!isCancelled) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load product.");
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadProduct();
    return () => {
      isCancelled = true;
    };
  }, [productId]);

  const generatedDate = product
    ? new Date(product.createdAt ?? product.payload.generatedAt ?? Date.now()).toLocaleDateString(undefined, {
      month: "long",
      day: "numeric",
      year: "numeric",
    })
    : null;
  const { subject, gradeLabel } = getProductMetadata(product);
  const headerMetaLine = [gradeLabel, subject].filter(Boolean).join(" • ");

  return (
    <div className="v4-viewer v4-print-shell">
      <div className="v4-shell v4-print-shell-inner">
        <section className="v4-print-toolbar print-hidden">
          <div>
            <p className="v4-kicker">Printable Product</p>
            <h1>{product ? getProductTitle(product) : "Print Preview"}</h1>
            <p className="v4-subtitle">Use the browser print dialog to print or save this document as a PDF.</p>
            {product && <p className="v4-body-copy">Date generated: {generatedDate}</p>}
          </div>
          <div className="v4-upload-actions">
            {product?.payload.kind === "test" && (
              <label className="v4-print-checkbox">
                <input
                  type="checkbox"
                  checked={showAnswerGuidance}
                  onChange={(event) => setShowAnswerGuidance(event.target.checked)}
                />
                <span>Show answer guidance</span>
              </label>
            )}
            <button className="v4-button v4-button-secondary" type="button" onClick={() => window.history.back()}>
              Back
            </button>
            <button className="v4-button" type="button" onClick={() => window.print()} disabled={!product}>
              Print or Save PDF
            </button>
          </div>
        </section>

        <section className="v4-print-document">
          {isLoading && <p className="v4-body-copy">Loading printable document...</p>}
          {error && <p className="v4-error">{error}</p>}
          {product && (
            <>
              <div className="v4-print-header">
                <p className="v4-kicker">Teacher Document</p>
                <h1 className="v4-print-document-title">{getProductTitle(product)}</h1>
                {headerMetaLine ? <p className="v4-print-document-meta">{headerMetaLine}</p> : null}
                <p className="v4-print-document-meta">Date generated: {generatedDate}</p>
                <p className="v4-print-document-meta">Generated from teacher documents</p>
              </div>
              <ProductViewer product={product} variant="print" showAnswerGuidance={showAnswerGuidance} />
              <footer className="v4-print-footer">
                <p>Generated from teacher documents.</p>
              </footer>
            </>
          )}
        </section>
      </div>
    </div>
  );
}