export function useGroupSigningEnabled(): boolean {
  return false;
}

export function useGroupSigningState(): {
  enabled: boolean;
  settled: boolean;
} {
  return { enabled: false, settled: true };
}
