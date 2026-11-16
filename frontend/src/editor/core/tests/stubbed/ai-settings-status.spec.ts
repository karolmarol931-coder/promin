import { test, expect } from "@editor/tests/helpers/stub-test-base";
import type { Page } from "@playwright/test";

test.use({ stubOptions: { enableLogin: true, isAdmin: true }, seedJwt: true });

const ENABLED_SETTINGS = {
  enabled: true,
  mode: "SELF_HOSTED",
  url: "http://127.0.0.1:5001",
  timeoutSeconds: 120,
  longRunningTimeoutSeconds: 600,
  streamTimeoutSeconds: 1800,
  features: {
    chat: true,
    documentQuestions: true,
    createPdf: true,
    mathAuditor: true,
    pdfComment: true,
    classify: false,
  },
  models: {
    provider: "ollama",
    smartModel: "llama3.1",
    fastModel: "llama3.1",
  },
  rag: {
    embeddingProvider: "ollama",
    embeddingModel: "nomic-embed-text",
    topK: 20,
  },
  limits: { maxPages: 500, maxCharacters: 200000, modelMaxConcurrency: 4 },
};

async function openAiSettings(
  page: Page,
  status: Record<string, unknown>,
  settings: Record<string, unknown> = ENABLED_SETTINGS,
) {
  await page.route("**/api/v1/admin/settings/section/aiEngine", (route) =>
    route.fulfill({ json: settings }),
  );
  await page.route("**/api/v1/ai/status", (route) =>
    route.fulfill({ json: status }),
  );
  await page.goto("/settings/adminAi");
  await expect(page.locator(".settings-page")).toBeVisible({ timeout: 30_000 });
  await page.locator(".settings-card").first().waitFor({ timeout: 20_000 });
}

function cardNamed(page: Page, heading: string) {
  return page.locator(".settings-card").filter({ hasText: heading }).first();
}

function smartModelInput(page: Page) {
  return cardNamed(page, "Models & Providers").getByRole("textbox", {
    name: /^Smart model High-capability/,
  });
}

test("a healthy local engine reports its models and accepted secret", async ({
  page,
}) => {
  await openAiSettings(page, {
    enabled: true,
    reachable: true,
    latencyMs: 84,
    authenticated: true,
    smartModel: "llama3.1",
    fastModel: "llama3.1",
  });

  await expect(page.getByText("Engine running").first()).toBeVisible();
  await expect(page.getByText("llama3.1").first()).toBeVisible();
  await expect(page.getByText("Accepted").first()).toBeVisible();
  await expect(page.getByText("84 ms").first()).toBeVisible();
});

test("a rejected shared secret reads as a problem, not as healthy", async ({
  page,
}) => {
  await openAiSettings(page, {
    enabled: true,
    reachable: true,
    authenticated: false,
    error: "The engine rejected this server's shared secret.",
  });

  await expect(
    page.getByText("Engine is up, but refusing this server").first(),
  ).toBeVisible();
  await expect(
    page.getByText(/different shared secrets/i).first(),
  ).toBeVisible();
  await expect(page.getByText("Rejected").first()).toBeVisible();
  await expect(page.getByText("Engine running")).toHaveCount(0);
});

test("an unreachable engine reports its error", async ({ page }) => {
  await openAiSettings(page, {
    enabled: true,
    reachable: false,
    error: "AI engine request timed out",
  });

  await expect(page.getByText("Engine unreachable").first()).toBeVisible();
  await expect(
    page.getByText("AI engine request timed out").first(),
  ).toBeVisible();
});

test("with AI off the status facts stay hidden", async ({ page }) => {
  await openAiSettings(
    page,
    { enabled: false, reachable: false },
    { ...ENABLED_SETTINGS, enabled: false },
  );

  await expect(page.getByText("AI is switched off").first()).toBeVisible();
  const statusCard = page.locator(".settings-card").first();
  await expect(statusCard.getByText("Smart model")).toHaveCount(0);
  await expect(statusCard.getByText("Engine URL")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: /Check again/i }),
  ).toBeDisabled();
});

test("the section navigation includes the status card", async ({ page }) => {
  await openAiSettings(page, {
    enabled: true,
    reachable: true,
    authenticated: true,
  });

  await expect
    .poll(async () =>
      (await page.locator(".settings-card__toggle").allInnerTexts()).map(
        (text) => text.trim(),
      ),
    )
    .toEqual([
      "Status",
      "Connection",
      "Capabilities",
      "Models & Providers",
      "Documents & RAG",
      "Limits & Performance",
    ]);
});

test("the mode chooser exposes only off and the local engine", async ({
  page,
}) => {
  await openAiSettings(page, {
    enabled: true,
    reachable: true,
    authenticated: true,
  });

  const self = page.getByRole("radio", { name: /Run your own engine/i });
  const off = page.getByRole("radio", { name: /^Off$/i });
  await expect(page.getByRole("radio")).toHaveCount(2);
  await expect(self).toBeChecked();
  await expect(page.getByLabel(/AI engine URL/i)).toBeVisible();

  await off.click();
  await expect(off).toBeChecked();
  await expect(page.getByLabel(/AI engine URL/i)).toHaveCount(0);

  await self.click();
  await expect(page.getByLabel(/AI engine URL/i)).toBeVisible();
});

test("the about notice has no broken setup guide", async ({ page }) => {
  await openAiSettings(page, {
    enabled: true,
    reachable: true,
    authenticated: true,
  });

  await expect(page.getByText("About the AI engine")).toBeVisible();
  await expect(page.getByRole("link", { name: /Set-up guide/i })).toHaveCount(
    0,
  );
});

test("the local engine status shows its URL and shared-secret state", async ({
  page,
}) => {
  await openAiSettings(page, {
    enabled: true,
    reachable: true,
    authenticated: true,
  });

  const statusCard = page.locator(".settings-card").first();
  await expect(
    statusCard.getByText("Engine URL", { exact: true }),
  ).toBeVisible();
  await expect(
    statusCard.getByText("Shared secret", { exact: true }),
  ).toBeVisible();
  await expect(
    statusCard.getByText("Account link", { exact: true }),
  ).toHaveCount(0);
});

test("local model settings remain editable", async ({ page }) => {
  await openAiSettings(
    page,
    { enabled: true, reachable: true, authenticated: true },
    ENABLED_SETTINGS,
  );

  await expect(smartModelInput(page)).toBeEnabled();
  await expect(
    cardNamed(page, "Documents & RAG").getByRole("textbox", {
      name: /^Embedding model/,
    }),
  ).toBeEnabled();
});
