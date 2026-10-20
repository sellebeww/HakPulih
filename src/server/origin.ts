// Next may normalize request.url to localhost while the actual browser uses
// 127.0.0.1. Host retains the authority of the incoming local HTTP request.
export function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const parsed = new URL(origin);
    const url = new URL(request.url);
    const host = request.headers.get("host") ?? url.host;
    return (
      parsed.origin === origin &&
      parsed.host === host &&
      parsed.protocol === url.protocol
    );
  } catch {
    return false;
  }
}
