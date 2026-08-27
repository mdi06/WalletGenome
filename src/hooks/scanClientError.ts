interface ApiErrorPayload {
  error?: string;
}

export async function unsuccessfulResponseError(response: Response): Promise<Error> {
  const payload = await response.json().catch(() => null) as ApiErrorPayload | null;
  return new Error(payload?.error || `HTTP ${response.status}`);
}
