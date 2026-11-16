import { useLogoAssets } from "@editor/hooks/useLogoAssets";

/** Theme-specific Promin mark image URLs. */
export function useLogoPath(): { dark: string; light: string } {
  const { tooltipLogo } = useLogoAssets();

  return { dark: tooltipLogo, light: tooltipLogo };
}
