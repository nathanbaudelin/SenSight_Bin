const trimSlash = (value: string) => value.replace(/\/+$/, "");

const buildCandidates = () => {
  const raw = [
    process.env.BACKEND_URL,
    process.env.NEXT_PUBLIC_BACKEND_URL,
    "http://backend:3000",
    "http://localhost:3000",
  ];

  const candidates: string[] = [];
  for (const entry of raw) {
    if (!entry) continue;
    const normalized = trimSlash(entry.trim());
    if (!normalized || candidates.includes(normalized)) continue;
    candidates.push(normalized);
  }

  return candidates;
};

export async function fetchBackend(path: string, init?: RequestInit) {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const candidates = buildCandidates();
  const errors: string[] = [];

  for (const baseUrl of candidates) {
    try {
      const response = await fetch(`${baseUrl}${cleanPath}`, {
        cache: "no-store",
        ...init,
      });
      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown error";
      errors.push(`${baseUrl}: ${message}`);
    }
  }

  throw new Error(`Unable to reach backend. Attempts: ${errors.join(" | ")}`);
}
