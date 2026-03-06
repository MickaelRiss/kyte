const IPC_ERROR_PREFIX = /^Error invoking remote method '[^']+': Error: /;

export function extractIpcError(err: unknown, fallback: string): string {
  const raw = err instanceof Error ? err.message : fallback;
  return raw.replace(IPC_ERROR_PREFIX, "");
}
