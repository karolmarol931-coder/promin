import { useEffect } from "react";
import { useViewer } from "@editor/contexts/ViewerContext";
import { useDocumentReady } from "@editor/components/viewer/hooks/useDocumentReady";
import { printPdfNatively } from "@editor/services/nativePrintService";
import { PrintAPIBridgeProps } from "@editor-core/components/viewer/PrintAPIBridge";

export function PrintAPIBridge({ file, url, fileName }: PrintAPIBridgeProps) {
  const { registerBridge } = useViewer();
  const documentReady = useDocumentReady();

  useEffect(() => {
    if (documentReady) {
      registerBridge("print", {
        state: {},
        api: {
          print: () => {
            void (async () => {
              // WKWebView does not reliably support iframe-based PDF printing yet:
              // https://github.com/tauri-apps/tauri/issues/13451#issuecomment-4045138142
              await printPdfNatively(file, url, fileName);
            })().catch((error) => {
              console.error("[Desktop Print] Print failed", error);
            });
          },
        },
      });
    }

    return () => {
      registerBridge("print", null);
    };
  }, [documentReady, file, fileName, registerBridge, url]);

  return null;
}
