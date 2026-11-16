import { act, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { useAuth } from "@editor/auth/UseSession";
import { AppConfigProvider } from "@editor/contexts/AppConfigContext";
import {
  QuickNavHostProvider,
  useQuickNavHost,
} from "@editor/contexts/QuickNavHostContext";
import { QuickNavHostBridge } from "@editor/components/shared/quickNav/QuickNavHostBridge";
import {
  fetchSigningSessions,
  type SigningSessions,
} from "@editor/api/signing";
import { alert } from "@editor/components/toast";
import { markSigningItemSeen } from "@editor/services/signingSeenStore";

const auth = vi.hoisted<Pick<ReturnType<typeof useAuth>, "user" | "loading">>(
  () => ({ user: { id: "ada" }, loading: false }),
);

vi.mock("@editor/auth/UseSession", () => ({
  useAuth: () => ({
    ...auth,
    displayName: auth.user?.id ?? null,
    isAnonymous: false,
  }),
}));
vi.mock("@editor/api/signing", () => ({ fetchSigningSessions: vi.fn() }));
vi.mock("@editor/components/toast", () => ({ alert: vi.fn() }));
vi.mock("@editor/components/shared/quickNav/useQuickNavToolReasons", () => ({
  useQuickNavToolReasons: () => null,
}));
vi.mock("@editor/services/thumbnailGenerationService", () => ({
  thumbnailGenerationService: { generateThumbnails: vi.fn(async () => []) },
}));

const mockFetch = vi.mocked(fetchSigningSessions);
const EMPTY: SigningSessions = { signRequests: [], mySessions: [] };
const UNREAD: SigningSessions = {
  signRequests: [],
  mySessions: [
    {
      sessionId: "session-1",
      documentName: "Document.pdf",
      createdAt: "2026-09-14T12:00:00Z",
      participantCount: 2,
      signedCount: 1,
      finalized: false,
    },
  ],
};

function RailState() {
  const host = useQuickNavHost();
  return (
    <>
      <output data-testid="badge">{host?.signingBadge}</output>
      <output data-testid="items">{JSON.stringify(host?.signingItems)}</output>
    </>
  );
}

function setup() {
  const clients = {
    editor: new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  };
  const markup = (
    app: keyof typeof clients | null,
    configReady = true,
    signingEnabled = true,
  ) => (
    <MemoryRouter>
      <QuickNavHostProvider>
        <RailState />
        {app && (
          <QueryClientProvider key={app} client={clients[app]}>
            <AppConfigProvider
              autoFetch={false}
              bootstrapMode="non-blocking"
              initialConfig={
                configReady
                  ? { storageGroupSigningEnabled: signingEnabled }
                  : null
              }
            >
              <QuickNavHostBridge />
            </AppConfigProvider>
          </QueryClientProvider>
        )}
      </QuickNavHostProvider>
    </MemoryRouter>
  );
  const view = render(markup("editor"));
  return (
    app: keyof typeof clients | null,
    configReady = true,
    signingEnabled = true,
  ) => view.rerender(markup(app, configReady, signingEnabled));
}

function expectRail(count: number) {
  expect(screen.getByTestId("badge")).toHaveTextContent(String(count));
}

describe("quick-nav signing data during view switches", () => {
  beforeEach(() => {
    auth.user = { id: "ada" };
    auth.loading = false;
    localStorage.clear();
    mockFetch.mockReset();
    vi.mocked(alert).mockClear();
    mockFetch.mockResolvedValue(UNREAD);
  });

  it("keeps the unread count in sync as owners view updates and ready sessions", async () => {
    const partial = UNREAD.mySessions[0];
    mockFetch.mockResolvedValue({
      signRequests: [
        {
          sessionId: "request",
          documentName: "Request.pdf",
          ownerUsername: "Owner",
          createdAt: "2026-09-24",
          dueDate: "",
          myStatus: "PENDING",
        },
      ],
      mySessions: [
        partial,
        { ...partial, sessionId: "ready", signedCount: 2 },
        { ...partial, sessionId: "closed", finalized: true },
      ],
    });
    setup();
    await waitFor(() => expectRail(3));
    const unreadCount = () =>
      JSON.parse(screen.getByTestId("items").textContent ?? "[]").filter(
        (item: { unread: boolean }) => item.unread,
      ).length;
    expect(unreadCount()).toBe(3);
    act(() => markSigningItemSeen("ada", { ...partial, kind: "session" }));
    await waitFor(() => expectRail(2));
    expect(unreadCount()).toBe(2);
    act(() =>
      markSigningItemSeen("ada", {
        ...partial,
        kind: "session",
        sessionId: "ready",
        signedCount: 2,
      }),
    );
    await waitFor(() => expectRail(1));
    expect(unreadCount()).toBe(1);
    expect(
      JSON.parse(screen.getByTestId("items").textContent ?? "[]"),
    ).toHaveLength(4);
  });
  it("retains the count until each incoming lookup settles", async () => {
    const switchView = setup();
    await waitFor(() => expectRail(1));
    switchView(null);
    expectRail(1);

    let resolveSessions = (_value: SigningSessions) => {};
    mockFetch.mockReturnValue(
      new Promise((resolve) => {
        resolveSessions = resolve;
      }),
    );
    auth.user = null;
    auth.loading = true;
    switchView("editor", false);
    expectRail(1);

    auth.user = { id: "ada" };
    auth.loading = false;
    switchView("editor", false);
    expectRail(1);

    switchView("editor");
    expectRail(1);

    await act(async () => resolveSessions(EMPTY));
    await waitFor(() => expectRail(0));

    mockFetch.mockReturnValue(
      new Promise((resolve) => {
        resolveSessions = resolve;
      }),
    );
    switchView("editor", false);
    expectRail(0);
    switchView("editor");
    expectRail(0);
    await act(async () => resolveSessions(UNREAD));
    await waitFor(() => expectRail(1));
    switchView("editor", true, false);
    expectRail(0);
  });

  it("keeps the previous count when a background signing request fails", async () => {
    const switchView = setup();
    await waitFor(() => expectRail(1));
    let rejectSessions = (_error: Error) => {};
    const request = new Promise<SigningSessions>((_resolve, reject) => {
      rejectSessions = reject;
    });
    mockFetch.mockReturnValueOnce(request);
    switchView(null);
    switchView("editor");
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
    await act(async () => {
      rejectSessions(new Error("Network unavailable"));
      await request.catch(() => undefined);
    });
    expect(alert).not.toHaveBeenCalled();
    expectRail(1);
  });

  it("drops the previous account's values during an account change and sign-out", async () => {
    const switchView = setup();
    await waitFor(() => expectRail(1));
    let resolveSessions = (_value: SigningSessions) => {};
    mockFetch.mockReturnValue(
      new Promise((resolve) => {
        resolveSessions = resolve;
      }),
    );

    auth.user = { id: "grace" };
    switchView("editor");
    expectRail(0);

    switchView("editor");
    await act(async () => resolveSessions(UNREAD));
    await waitFor(() => expectRail(1));

    mockFetch.mockResolvedValue(EMPTY);
    auth.user = null;
    switchView("editor");
    expectRail(0);
  });
});
