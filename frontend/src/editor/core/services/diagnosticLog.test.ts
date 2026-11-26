import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createDiagnosticReport,
  getDiagnosticEvents,
  installDiagnosticHandlers,
  recordDiagnosticEvent,
  recordDiagnosticException,
} from "@editor/services/diagnosticLog";

describe("local diagnostic log", () => {
  beforeEach(() => localStorage.clear());

  it("stores safe event metadata without arbitrary values or file names", () => {
    recordDiagnosticEvent("info", "forms", "save-started", {
      operationId: "op-123",
      provider: "pdfbox",
      fieldCount: 14,
      fileName: "client-form.pdf",
      personValue: "private value",
    });

    const serialized = JSON.stringify(getDiagnosticEvents());
    expect(serialized).toContain('"provider":"pdfbox"');
    expect(serialized).toContain('"fieldCount":14');
    expect(serialized).not.toContain("client-form.pdf");
    expect(serialized).not.toContain("private value");
  });

  it("records exception type and HTTP code without the exception message", () => {
    const error = Object.assign(new Error("private form contents"), {
      response: {
        status: 500,
        data: { errorCode: "FORM_FILL_FAILED" },
      },
    });

    recordDiagnosticException("forms", "save-failed", error, {
      operationId: "op-123",
      phase: "fill",
    });

    const [event] = getDiagnosticEvents();
    expect(event.details).toMatchObject({
      errorType: "Error",
      httpStatus: 500,
      errorCode: "FORM_FILL_FAILED",
      phase: "fill",
    });
    expect(JSON.stringify(event)).not.toContain("private form contents");
  });

  it("keeps only a known-safe operating system error summary", () => {
    recordDiagnosticException(
      "forms",
      "print-failed",
      new Error("The object can not be found here."),
    );

    const [event] = getDiagnosticEvents();
    expect(event.errorSummary).toBe("The object can not be found here.");

    recordDiagnosticException(
      "forms",
      "save-failed",
      new Error("private form contents"),
    );
    expect(JSON.stringify(getDiagnosticEvents())).not.toContain(
      "private form contents",
    );
  });

  it("captures caught errors sent to the application error log", () => {
    const output = vi.spyOn(console, "error").mockImplementation(() => {});
    const uninstall = installDiagnosticHandlers();

    console.error(
      "[FormFill] Save failed",
      new Error("private customer value"),
    );

    const [event] = getDiagnosticEvents();
    expect(event).toMatchObject({
      source: "console",
      event: "logged-error",
      level: "error",
      details: { errorType: "Error", errorCode: "FormFill" },
    });
    expect(JSON.stringify(event)).not.toContain("private customer value");

    uninstall();
    output.mockRestore();
  });

  it("keeps only the API route and drops query data from request errors", () => {
    const error = Object.assign(new Error("secret"), {
      config: {
        url: "/api/v1/form/fill?name=private.pdf&value=12345",
      },
    });
    recordDiagnosticException("api", "request-failed", error, {
      endpoint: error.config.url,
    });

    const serialized = JSON.stringify(getDiagnosticEvents());
    expect(serialized).toContain("/api/v1/form/fill");
    expect(serialized).not.toContain("private.pdf");
    expect(serialized).not.toContain("12345");
  });

  it("limits the local history and exports the version with event metadata", () => {
    for (let index = 0; index < 305; index += 1) {
      recordDiagnosticEvent("info", "forms", "save-started", {
        fieldCount: index,
      });
    }

    expect(getDiagnosticEvents()).toHaveLength(300);
    expect(
      createDiagnosticReport("3.2.27", [
        '[ERROR] Could not read "private.pdf" value=secret /Users/alice/private.pdf',
      ]),
    ).toMatchObject({
      application: "Promin Desktop",
      version: "3.2.27",
      events: expect.any(Array),
      nativeLogs: expect.any(Array),
    });

    const report = JSON.stringify(
      createDiagnosticReport("3.2.27", [
        '[ERROR] Could not read "private.pdf" value=secret /Users/alice/private.pdf',
      ]),
    );
    expect(report).not.toContain("private.pdf");
    expect(report).not.toContain("secret");
    expect(report).not.toContain("/Users/alice");
  });
});
