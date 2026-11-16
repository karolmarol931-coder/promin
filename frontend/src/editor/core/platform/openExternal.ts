/**
 * core/web implementation of the @editor/platform/openExternal seam.
 *
 * The core implementation opens an external URL in a new tab. The desktop
 * implementation shadows this with the native platform handler.
 */
export const openExternal = async (url: string): Promise<void> => {
  window.open(url, "_blank", "noopener,noreferrer");
};
