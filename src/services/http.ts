export type FetchJsonOptions = {
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
};

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(() => resolve(), ms));
}

function isRetryableStatus(status: number) {
  return status >= 500 || status === 408 || status === 429;
}

function isLikelyNetworkError(err: any) {
  const msg = String(err?.message ?? err ?? '').toLowerCase();
  return msg.includes('network') || msg.includes('timeout') || msg.includes('failed to fetch');
}

export async function fetchWithTimeout(input: RequestInfo, init: RequestInit | undefined, timeoutMs: number) {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const id = setTimeout(() => {
    try {
      controller?.abort();
    } catch {
      // ignore
    }
  }, Math.max(500, timeoutMs));

  try {
    const res = await fetch(input as any, { ...(init || {}), signal: controller?.signal as any });
    return res;
  } finally {
    clearTimeout(id);
  }
}

export async function fetchJson<T>(url: string, init: RequestInit, options?: FetchJsonOptions): Promise<{ res: Response; json: T }>
{
  const timeoutMs = options?.timeoutMs ?? 12000;
  const retries = options?.retries ?? 1;
  const retryDelayMs = options?.retryDelayMs ?? 650;

  let lastErr: any = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetchWithTimeout(url, init, timeoutMs);
      const json = (await res.json().catch(() => ({}))) as T;

      if (!res.ok && isRetryableStatus(res.status) && attempt < retries) {
        await sleep(retryDelayMs);
        continue;
      }

      return { res, json };
    } catch (e) {
      lastErr = e;
      if (attempt < retries && isLikelyNetworkError(e)) {
        await sleep(retryDelayMs);
        continue;
      }
      throw e;
    }
  }

  throw lastErr;
}
