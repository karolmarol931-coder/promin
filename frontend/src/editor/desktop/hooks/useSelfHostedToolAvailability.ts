export function useSelfHostedToolAvailability(
  _tools: Array<{ id: string; endpoints?: string[] }>,
): Set<string> {
  return new Set();
}
