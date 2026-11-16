import { beforeEach, describe, it, expect, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import LoggedInState from "@editor/routes/login/LoggedInState";
const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("LoggedInState", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it("navigates to the local app root", async () => {
    render(
      <MemoryRouter>
        <LoggedInState />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });
    });
  });
});
