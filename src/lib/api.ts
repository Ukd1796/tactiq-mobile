// Identical logic to web src/lib/api.ts — only env var prefix changed
const BASE_URL =
  (process.env.EXPO_PUBLIC_API_URL as string | undefined) ?? 'http://localhost:8000/api';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => `HTTP ${res.status}`);
    throw new ApiError(res.status, text);
  }

  return res.json() as Promise<T>;
}

export const api = {
  get:    <T>(path: string)               => request<T>(path),
  post:   <T>(path: string, body: unknown) => request<T>(path, { method: 'POST',   body: JSON.stringify(body) }),
  delete: <T = void>(path: string)         => request<T>(path, { method: 'DELETE' }),
};
