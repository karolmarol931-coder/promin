import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";
import type { PluginOption, Rollup } from "vite";
import type { PreRenderedAsset } from "rollup";
import { existsSync, readdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import tsconfigPaths from "vite-tsconfig-paths";
import { supportedLanguages } from "./src/editor/core/i18n/languages";
// oxlint-disable-next-line no-restricted-imports -- config runs in node, before the aliases exist
import { iconSvgr } from "./scripts/icons/svgrOptions.mts";
// oxlint-disable-next-line no-restricted-imports -- config runs in node, before the aliases exist
import { embedpdfFontFallbackPlugin } from "./scripts/embedpdfFontFallbackPatch.mts";
import { viteStaticCopy } from "vite-plugin-static-copy";

const mjsToJsAssetFileNames = (assetInfo: PreRenderedAsset) =>
  assetInfo.names.some((name) => name.endsWith(".mjs"))
    ? "assets/[name]-[hash].js"
    : "assets/[name]-[hash][extname]";

type ManualChunkMeta = Parameters<Rollup.GetManualChunk>[1];

const startupModulesByOutput = new WeakMap<ManualChunkMeta, Set<string>>();

function pruneUnsupportedLocaleAssets(): PluginOption {
  let localeOutputDir: string | undefined;
  return {
    name: "promin-supported-locale-assets",
    apply: "build",
    configResolved(config) {
      localeOutputDir = resolve(config.root, config.build.outDir, "locales");
    },
    closeBundle() {
      if (!localeOutputDir || !existsSync(localeOutputDir)) return;
      for (const entry of readdirSync(localeOutputDir, { withFileTypes: true })) {
        if (
          entry.isDirectory() &&
          !Object.prototype.hasOwnProperty.call(supportedLanguages, entry.name)
        ) {
          rmSync(resolve(localeOutputDir, entry.name), {
            force: true,
            recursive: true,
          });
        }
      }
    },
  };
}

/**
 * The modules the entry imports statically: these load before first render, so
 * a chunk every page loads should hold only them. Memoized per output because
 * Rollup hands manualChunks the module graph once per output.
 */
function startupModules(meta: ManualChunkMeta): Set<string> {
  let modules = startupModulesByOutput.get(meta);
  if (modules) return modules;
  modules = new Set();
  const queue = [...meta.getModuleIds()].filter(
    (id) => meta.getModuleInfo(id)?.isEntry,
  );
  for (const id of queue) {
    if (modules.has(id)) continue;
    modules.add(id);
    queue.push(...(meta.getModuleInfo(id)?.importedIds ?? []));
  }
  startupModulesByOutput.set(meta, modules);
  return modules;
}

/**
 * The npm package a normalized module id belongs to, or null for app code. Ids
 * are absolute paths, often through a pnpm store, so the package is the segment
 * after the last node_modules. Matching on that segment, rather than a raw path
 * substring, keeps a directory that merely looks like a package from steering
 * the split.
 */
function packageNameOf(id: string): string | null {
  const marker = "node_modules/";
  const index = id.lastIndexOf(marker);
  // Reject a match inside a longer directory name such as "my-node_modules".
  if (index === -1 || (index > 0 && id[index - 1] !== "/")) return null;
  const [first, second] = id.slice(index + marker.length).split("/");
  if (!first) return null;
  return first.startsWith("@") ? `${first}/${second ?? ""}` : first;
}

function inScope(pkg: string, scope: string): boolean {
  return pkg === scope || pkg.startsWith(`${scope}/`);
}

// react-markdown and its remark/micromark/mdast/hast closure is heavy and only
// needed when a disclaimer, document or chat message renders. Matching on the
// package name keeps an app file named like one of these out of the chunk.
const MARKDOWN_PACKAGE_PREFIXES = [
  "remark-",
  "rehype-",
  "micromark",
  "mdast-",
  "hast-",
  "unist-",
  "estree-util-",
  "style-to-",
  "character-entities",
  "vfile",
] as const;
const MARKDOWN_PACKAGES = new Set([
  "react-markdown",
  "unified",
  "parse-entities",
  "decode-named-character-reference",
  "markdown-table",
  "devlop",
  "longest-streak",
  "ccount",
  "zwitch",
  "trough",
  "bail",
  "is-plain-obj",
  "property-information",
  "space-separated-tokens",
  "comma-separated-tokens",
  "trim-lines",
  "html-url-attributes",
  "@ungap/structured-clone",
]);

function isMarkdownPackage(pkg: string): boolean {
  return (
    MARKDOWN_PACKAGES.has(pkg) ||
    MARKDOWN_PACKAGE_PREFIXES.some((prefix) => pkg.startsWith(prefix))
  );
}

export default defineConfig(async ({ mode, command }) => {
  if (mode !== "desktop") {
    throw new Error("Promin only supports the native macOS desktop mode.");
  }

  const devWorktreeLabel =
    command === "serve" ? (process.env.STIRLING_DEV_LABEL ?? "") : "";
  const tsconfigProject = "./tsconfig.desktop.vite.json";

  return {
    cacheDir: "node_modules/.vite-desktop",
    resolve: {
      // Linked workspace dependencies must share the renderer's React instance.
      dedupe: ["react", "react-dom"],
    },
    define: {
      __DEV_WORKTREE_LABEL__: JSON.stringify(devWorktreeLabel),
    },
    plugins: [
      embedpdfFontFallbackPlugin(),
      iconSvgr(),
      react(),
      tsconfigPaths({
        projects: [tsconfigProject],
      }),
      pruneUnsupportedLocaleAssets(),
      // ANALYZE=true emits dist/stats.json; the visualizer is ESM-only, hence
      // the dynamic import.
      ...(process.env.ANALYZE === "true"
        ? [
            (await import("rollup-plugin-visualizer")).visualizer({
              filename: "dist/stats.json",
              template: "raw-data",
              gzipSize: true,
              brotliSize: true,
              emitFile: false,
            }) as PluginOption,
          ]
        : []),
      viteStaticCopy({
        targets: [
          {
            // Copy jscanify vendor files to dist
            src: "public/vendor/jscanify/*",
            dest: "vendor/jscanify",
          },
          {
            // pdfjs-dist CMap data for CJK / non-latin glyph mapping. Required
            // when rendering PDFs inside workers where the default DOM fetch paths
            // aren't available.
            src: "node_modules/pdfjs-dist/cmaps/*",
            dest: "pdfjs/cmaps",
          },
          {
            // pdfjs-dist standard font data (Helvetica/Times/etc.) needed so
            // workers can substitute non-embedded base 14 fonts without DOM access.
            src: "node_modules/pdfjs-dist/standard_fonts/*",
            dest: "pdfjs/standard_fonts",
          },
          {
            src: "node_modules/tesseract.js/dist/worker.min.js",
            dest: "ocr",
          },
          {
            src: "node_modules/tesseract.js-core/tesseract-core-simd-lstm.wasm.js",
            dest: "ocr/core",
          },
          {
            src: "node_modules/tesseract.js-core/tesseract-core-simd-lstm.wasm",
            dest: "ocr/core",
          },
          {
            src: "node_modules/tesseract.js-core/tesseract-core-lstm.wasm.js",
            dest: "ocr/core",
          },
          {
            src: "node_modules/tesseract.js-core/tesseract-core-lstm.wasm",
            dest: "ocr/core",
          },
          {
            src: "node_modules/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz",
            dest: "ocr/lang",
          },
          {
            src: "node_modules/@tesseract.js-data/pol/4.0.0_best_int/pol.traineddata.gz",
            dest: "ocr/lang",
          },
          {
            src: "node_modules/@tesseract.js-data/rus/4.0.0_best_int/rus.traineddata.gz",
            dest: "ocr/lang",
          },
          {
            src: "src/editor/core/assets/brand/promin/*",
            dest: "promin",
          },
        ],
      }),
    ],
    // Worker bundles are a separate Rollup pass and do NOT inherit `plugins`,
    // so without this `@editor/*` resolves in the app and fails in a worker.
    worker: {
      plugins: () => [tsconfigPaths({ projects: [tsconfigProject] })],
      // Worker sub-builds do not inherit the main build's output options, so
      // without this a worker asset referenced from inside a worker is emitted
      // as .mjs again (see mjsToJsAssetFileNames above).
      rollupOptions: {
        output: {
          assetFileNames: mjsToJsAssetFileNames,
        },
      },
    },
    server: {
      host: "127.0.0.1",
      port: 5173,
      strictPort: true,
      watch: {
        // tell vite to ignore watching `src-tauri`
        ignored: ["**/src-tauri/**"],
      },
    },
    build: {
      target: "esnext",
      modulePreload: {
        // Lazy chunks can import the entry again. An upfront link lets Vite reuse
        // its preload instead of fetching an already-running module in WebKit.
        resolveDependencies: (filename, deps, { hostType }) =>
          hostType === "html" ? [filename, ...deps] : deps,
      },
      // Minifies better than esbuild for this esnext target.
      cssMinify: "lightningcss" as const,
      rollupOptions: {
        output: {
          assetFileNames: mjsToJsAssetFileNames,
          manualChunks(id: string, meta: ManualChunkMeta) {
            if (id.includes("material-symbols-icons.json"))
              return "vendor-iconset";
            // An asset URL import compiles to a single string. Filed by package
            // name it joins that package's vendor chunk, and its importer then
            // loads the whole chunk: the startup WASM warm-up imports pdfium's
            // URL, which would pull all of embedpdf into the initial load.
            if (id.includes("?url")) return undefined;
            // Left to Rollup, this lands in the first dynamic-importing vendor
            // chunk and the entry then statically imports that whole chunk.
            if (id.includes("vite/preload-helper")) return "vendor-preload";

            const pkg = packageNameOf(id);
            if (!pkg) return undefined;

            if (pkg === "pdfjs-dist") return "vendor-pdfjs";
            // Only the lazily opened viewer needs the engine and the plugins;
            // the startup graph needs just the pdfium glue and the shared
            // enums, so they get their own chunks.
            if (pkg === "@embedpdf/engines") return "vendor-embedpdf";
            if (pkg === "@embedpdf/pdfium") return "vendor-pdfium";
            if (
              pkg === "@embedpdf/core" ||
              pkg === "@embedpdf/models" ||
              pkg === "@embedpdf/utils" ||
              pkg === "@embedpdf/plugin-spread"
            ) {
              return "vendor-embedpdf-core";
            }
            if (inScope(pkg, "@embedpdf")) return "vendor-embedpdf";
            // Without its own chunk the portal's static import drags the
            // markdown pipeline into vendor-ui, which the editor preloads.
            if (isMarkdownPackage(pkg)) return "vendor-markdown";
            // Splitting these out keeps icon changes from invalidating all of
            // vendor-ui.
            if (pkg === "@mui/icons-material") return "vendor-mui-icons";
            if (pkg === "@iconify/react") return "vendor-iconify";
            // These packages are mutually circular: splitting them breaks
            // module init order at runtime. Only startup modules land in
            // vendor-ui; libraries only some screens use (the markdown
            // renderer, the date pickers) go with the screens that import them.
            if (
              pkg.includes("react") ||
              pkg === "scheduler" ||
              inScope(pkg, "@mantine") ||
              inScope(pkg, "@mui") ||
              inScope(pkg, "@emotion") ||
              inScope(pkg, "@iconify")
            ) {
              return startupModules(meta).has(id) ? "vendor-ui" : undefined;
            }
            if (pkg === "@cantoo/pdf-lib" || pkg === "pdf-lib")
              return "vendor-pdflib";
            if (
              pkg === "recharts" ||
              pkg === "d3" ||
              pkg.startsWith("d3-") ||
              pkg === "decimal.js"
            ) {
              return "vendor-charts";
            }
            if (pkg === "jszip" || pkg === "pako") return "vendor-zip";
            if (pkg.includes("i18next")) return "vendor-i18n";
          },
        },
      },
    },
    optimizeDeps: {
      exclude: ["@embedpdf/pdfium"],
    },
    base: "./",
  };
});
