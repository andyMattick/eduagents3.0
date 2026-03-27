/** @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";

import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";

const { authState, logoutMock, signInMock, signUpMock } = vi.hoisted(() => ({
  authState: {
    user: {
      id: "teacher-1",
      email: "teacher@example.com",
      name: "Teacher One",
      isAdmin: false,
    },
    isLoading: false,
    error: null as string | null,
  },
  logoutMock: vi.fn(),
  signInMock: vi.fn(),
  signUpMock: vi.fn(),
}));

vi.mock("../components_new/Auth/useAuth", () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  useAuth: () => ({
    user: authState.user,
    session: null,
    isLoading: authState.isLoading,
    error: authState.error,
    signIn: signInMock,
    signUp: signUpMock,
    logout: logoutMock,
  }),
}));

vi.mock("../hooks/useTheme", () => ({
  ThemeProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("../hooks/useNotepad", () => ({
  NotepadProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("../hooks/useUserFlow", () => ({
  UserFlowProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("../components_new/Auth/SignIn", () => ({
  SignIn: () => <div>Sign In Screen</div>,
}));

vi.mock("../components_new/Auth/SignUp", () => ({
  SignUp: () => <div>Sign Up Screen</div>,
}));

vi.mock("../components_new/Admin/AdminDashboard", () => ({
  AdminDashboard: () => <div>Admin Dashboard</div>,
}));

vi.mock("../components_new/APICallNotifier", () => ({
  APICallNotifier: () => <div data-testid="api-call-notifier" />,
}));

vi.mock("../components_new/v4/DocumentUpload", () => ({
  DocumentUpload: () => <div>Document Upload Screen</div>,
}));

vi.mock("../components_new/v4/PrintProductPage", () => ({
  PrintProductPage: () => <div>Print Product Screen</div>,
}));

import App from "../App";

describe("App v4 home shell", () => {
  beforeEach(() => {
    authState.user = {
      id: "teacher-1",
      email: "teacher@example.com",
      name: "Teacher One",
      isAdmin: false,
    };
    authState.isLoading = false;
    authState.error = null;
    logoutMock.mockReset();
    signInMock.mockReset();
    signUpMock.mockReset();
    window.history.replaceState({}, "", "/");
  });

  afterEach(() => {
    cleanup();
  });

  it("lands teachers on the v4 ingestion home and hides legacy navigation", () => {
    render(<App />);

    expect(screen.getByText("Agents of Education: Home")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Document Ingestion" })).toBeInTheDocument();
    expect(screen.getByText("Document Upload Screen")).toBeInTheDocument();
    expect(screen.queryByText("Templates")).not.toBeInTheDocument();
    expect(screen.queryByText("Pipeline")).not.toBeInTheDocument();
    expect(screen.queryByText("My Assessments")).not.toBeInTheDocument();
  });

  it("redirects legacy routes back to the v4 home surface", async () => {
    window.history.replaceState({}, "", "/templates");

    render(<App />);

    await waitFor(() => {
      expect(window.location.pathname).toBe("/");
    });
    expect(screen.getByText("Document Upload Screen")).toBeInTheDocument();
  });

  it("allows printable product routes without redirecting back home", () => {
    window.history.replaceState({}, "", "/print/product-123");

    render(<App />);

    expect(window.location.pathname).toBe("/print/product-123");
    expect(screen.getByRole("heading", { name: "Printable Product" })).toBeInTheDocument();
    expect(screen.getByText("Print Product Screen")).toBeInTheDocument();
  });
});