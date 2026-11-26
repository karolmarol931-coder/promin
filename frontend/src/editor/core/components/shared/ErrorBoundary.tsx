import React from "react";
import { Text, Stack } from "@mantine/core";
import { Button } from "@editor/ui/Button";
import i18n from "i18next";
import { recordDiagnosticException } from "@editor/services/diagnosticLog";

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; retry: () => void }>;
}

export default class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    recordDiagnosticException("react", "render-error", error, {
      phase: errorInfo.componentStack ? "component-render" : "unknown",
    });
  }

  retry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const Fallback = this.props.fallback;
        return <Fallback error={this.state.error} retry={this.retry} />;
      }

      return (
        <Stack
          align="center"
          justify="center"
          style={{
            minHeight: "200px",
            padding: "2rem",
            maxWidth: "800px",
            margin: "0 auto",
          }}
        >
          <Text size="lg" fw={500} c="var(--color-red-dark)">
            {i18n.t("errorBoundary.title", "Something went wrong")}
          </Text>
          {process.env.NODE_ENV === "development" && this.state.error && (
            <>
              <Text
                size="sm"
                c="dimmed"
                style={{
                  textAlign: "center",
                  fontFamily: "monospace",
                  marginTop: "1rem",
                }}
              >
                {this.state.error.message}
              </Text>
              {this.state.error.stack && (
                <details style={{ marginTop: "1rem", width: "100%" }}>
                  <summary
                    style={{ cursor: "pointer", marginBottom: "0.5rem" }}
                  >
                    <Text size="sm" component="span">
                      Show stack trace
                    </Text>
                  </summary>
                  <pre
                    style={{
                      fontSize: "0.75rem",
                      overflow: "auto",
                      backgroundColor: "var(--c-surface-sunken)",
                      padding: "1rem",
                      borderRadius: "4px",
                      maxHeight: "300px",
                    }}
                  >
                    {this.state.error.stack}
                  </pre>
                </details>
              )}
            </>
          )}
          <Button
            onClick={this.retry}
            variant="secondary"
            style={{ marginTop: "var(--mantine-spacing-md)" }}
          >
            {i18n.t("errorBoundary.tryAgain", "Try Again")}
          </Button>
        </Stack>
      );
    }

    return this.props.children;
  }
}
