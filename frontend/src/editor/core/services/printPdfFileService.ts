export async function printPdfFile(
  file: Blob,
  _fileName: string,
): Promise<void> {
  const url = URL.createObjectURL(file);
  const frame = document.createElement("iframe");
  frame.title = "PDF print preview";
  frame.style.position = "fixed";
  frame.style.width = "1px";
  frame.style.height = "1px";
  frame.style.opacity = "0";
  frame.src = url;

  const cleanup = () => {
    frame.remove();
    URL.revokeObjectURL(url);
  };

  await new Promise<void>((resolve, reject) => {
    frame.addEventListener(
      "load",
      () => {
        const printWindow = frame.contentWindow;
        if (!printWindow) {
          cleanup();
          reject(new Error("Could not open the PDF print preview"));
          return;
        }
        printWindow.addEventListener("afterprint", cleanup, { once: true });
        try {
          printWindow.focus();
          printWindow.print();
          resolve();
        } catch (error) {
          cleanup();
          reject(error);
        }
      },
      { once: true },
    );
    frame.addEventListener(
      "error",
      () => {
        cleanup();
        reject(new Error("Could not load the PDF print preview"));
      },
      { once: true },
    );
    document.body.appendChild(frame);
  });
}
