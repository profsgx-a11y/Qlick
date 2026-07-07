/**
 * Renders a JSON-LD structured-data block for search engines. Server-only;
 * the payload is trusted (built from our own data), stringified into a script.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
