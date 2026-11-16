// @vitest-environment node
import { describe, expect, test } from "vitest";
import * as fs from "fs";
import * as path from "path";

/**
 * Tests that all required logo assets exist.
 * This ensures that when useLogoAssets returns paths, those files actually exist.
 */
describe("useLogoAssets - Logo Asset Files", () => {
  const publicDir = path.resolve(__dirname, "../../../../public");
  const logoDir = path.resolve(__dirname, "../assets/brand/promin");

  // All asset files that useLogoAssets references
  const requiredAssets = [
    "promin-location-mark.svg",
    "promin-partner-logo.png",
    "promin-app-icon.svg",
    "promin-app-icon.png",
    "favicon.png",
    "logo192.png",
    "logo512.png",
    "promin-wordmark-white.svg",
    "promin-wordmark.svg",
  ];

  test("logo folder should exist", () => {
    expect(fs.existsSync(logoDir)).toBe(true);
  });

  test.each(requiredAssets)("should have %s", (assetName) => {
    const assetPath = path.join(logoDir, assetName);
    expect(fs.existsSync(assetPath), `Missing asset: promin/${assetName}`).toBe(
      true,
    );
  });

  test("manifest.json should exist", () => {
    const manifestPath = path.join(publicDir, "manifest.json");
    expect(fs.existsSync(manifestPath)).toBe(true);
  });
});
