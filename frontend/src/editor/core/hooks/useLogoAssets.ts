import { useMemo } from "react";
import { BASE_PATH } from "@editor/constants/app";

const LOGO_FOLDER = "promin";

export function useLogoAssets() {
  return useMemo(() => {
    const folderPath = `${BASE_PATH}/${LOGO_FOLDER}`;

    return {
      folderPath,
      getAssetPath: (name: string) => `${folderPath}/${name}`,
      wordmark: {
        black: `${folderPath}/promin-wordmark.svg`,
        grey: `${folderPath}/promin-wordmark.svg`,
        white: `${folderPath}/promin-wordmark-white.svg`,
      },
      tooltipLogo: `${folderPath}/promin-location-mark.svg`,
      firstPage: `${folderPath}/promin-partner-logo.png`,
      favicon: `${folderPath}/favicon.png`,
      logo192: `${folderPath}/logo192.png`,
      logo512: `${folderPath}/logo512.png`,
      manifestHref: `${BASE_PATH}/manifest.json`,
    };
  }, []);
}
