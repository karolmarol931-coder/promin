export * from "@editor-core/query/staleTime";

// Desktop keys don't pin a backend (see DesktopQueryCacheReset), so expire as a
// backstop for desktop configuration and endpoint availability.
export const CONFIG_STALE_TIME = 5 * 60_000;
