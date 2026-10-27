const activeUrls = new Set<string>();

export function createTrackedObjectUrl(blob: Blob): string {
  const url = URL.createObjectURL(blob);
  activeUrls.add(url);
  return url;
}

export function revokeObjectUrl(url: string): void {
  if (!activeUrls.delete(url)) return;
  URL.revokeObjectURL(url);
}

export function revokeAllObjectUrls(): void {
  for (const url of activeUrls) URL.revokeObjectURL(url);
  activeUrls.clear();
}

