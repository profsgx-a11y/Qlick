/**
 * Renders a JSON-LD structured-data block for search engines.
 *
 * The payload is NOT fully trusted: business pages feed it owner-written text
 * (shop name, description, address). `JSON.stringify` leaves `<` untouched, so
 * a name containing `</script>` would break out of the tag — escape the few
 * characters that matter inside a <script> body before writing them out.
 */
function safeJson(data: Record<string, unknown>): string {
  // <, >, & break out of a <script> body; U+2028/U+2029 are raw JS line
  // terminators. All five are legal in JSON, so re-encode them as escapes.
  return JSON.stringify(data).replace(
    /[<>&\u2028\u2029]/g,
    (c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"),
  );
}

export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: safeJson(data) }}
    />
  );
}
