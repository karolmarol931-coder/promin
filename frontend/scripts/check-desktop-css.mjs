import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const distPath = fileURLToPath(new URL("../dist/", import.meta.url));
const assetsPath = path.join(distPath, "assets");
const stylesheetPaths = (await readdir(assetsPath))
  .filter((filename) => filename.endsWith(".css"))
  .map((filename) => path.join(assetsPath, filename));

if (stylesheetPaths.length === 0) {
  throw new Error("Desktop production bundle has no linked stylesheets.");
}

const stylesheet = (
  await Promise.all(
    stylesheetPaths.map((stylesheetPath) => readFile(stylesheetPath, "utf8")),
  )
).join("\n");

const requiredRules = [
  ["flex", "display:flex"],
  ["flex-1", "flex:1"],
  ["items-center", "align-items:center"],
  ["justify-center", "justify-content:center"],
];

for (const [className, declaration] of requiredRules) {
  const escapedClassName = className.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const rule = stylesheet.match(
    new RegExp(`\\.${escapedClassName}\\s*\\{([^}]*)\\}`),
  );

  if (!rule?.[1].replace(/\s+/g, "").includes(declaration)) {
    throw new Error(
      `Desktop production CSS is missing .${className} { ${declaration} }.`,
    );
  }
}

if (
  !stylesheet.includes(
    "grid-template-columns:repeat(auto-fit,minmax(min(100%,9rem),1fr))",
  ) ||
  !/\._methodButton_[^\s{]+\s+\.mantine-Button-label\{[^}]*white-space:normal/.test(
    stylesheet,
  )
) {
  throw new Error(
    "Desktop production CSS is missing responsive Split method labels.",
  );
}

process.stdout.write(
  "Desktop production CSS contains required layout utilities and responsive Split labels.\n",
);
