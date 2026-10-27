import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import GuestRoute from "../src/components/GuestRoute";
import ProtectedRoute from "../src/components/ProtectedRoute";
import {
  AuthContext,
  AuthProvider,
  useAuth,
} from "../src/context/AuthContext";
import { getPostAuthPath } from "../src/utils/authRedirect";

function authValue(overrides = {}) {
  return {
    token: null,
    user: null,
    isAuthenticated: false,
    isAuthReady: true,
    login: () => {},
    logout: () => {},
    ...overrides,
  };
}

function renderProtectedRoute(overrides, initialPath = "/dashboard") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthContext.Provider value={authValue(overrides)}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<p>Private dashboard</p>} />
          </Route>
          <Route path="/login" element={<p>Login screen</p>} />
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>
  );
}

function renderGuestRoute(overrides, initialPath = "/login") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthContext.Provider value={authValue(overrides)}>
        <Routes>
          <Route element={<GuestRoute />}>
            <Route path="/login" element={<p>Login screen</p>} />
          </Route>
          <Route path="/dashboard" element={<p>Private dashboard</p>} />
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>
  );
}

function AuthHarness() {
  const { isAuthenticated, login, logout, user } = useAuth();

  return (
    <div>
      <p>{isAuthenticated ? `Signed in as ${user.name}` : "Signed out"}</p>
      <button
        type="button"
        onClick={() =>
          login({
            token: "in-memory-token",
            user: { id: "user-1", name: "Ada" },
          })
        }
      >
        Log in
      </button>
      <button type="button" onClick={logout}>
        Log out
      </button>
    </div>
  );
}

describe("authentication route guards", () => {
  it("redirects unauthenticated users away from private content", () => {
    renderProtectedRoute();

    expect(screen.getByText("Login screen")).toBeTruthy();
    expect(screen.queryByText("Private dashboard")).toBeNull();
  });

  it("renders private content only for authenticated users", () => {
    renderProtectedRoute({
      token: "token",
      user: { id: "user-1", name: "Ada" },
      isAuthenticated: true,
    });

    expect(screen.getByText("Private dashboard")).toBeTruthy();
    expect(screen.queryByText("Login screen")).toBeNull();
  });

  it("shows no private content while authentication is unresolved", () => {
    renderProtectedRoute({ isAuthReady: false });

    expect(screen.getByText("Checking your session...")).toBeTruthy();
    expect(screen.queryByText("Private dashboard")).toBeNull();
  });

  it("redirects authenticated users away from login", () => {
    renderGuestRoute({
      token: "token",
      user: { id: "user-1", name: "Ada" },
      isAuthenticated: true,
    });

    expect(screen.getByText("Private dashboard")).toBeTruthy();
    expect(screen.queryByText("Login screen")).toBeNull();
  });

  it("allows unauthenticated users to see login", () => {
    renderGuestRoute();

    expect(screen.getByText("Login screen")).toBeTruthy();
  });
});

describe("auth context", () => {
  it("stores login state in memory and clears it on logout", async () => {
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <AuthHarness />
      </AuthProvider>
    );

    expect(screen.getByText("Signed out")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Log in" }));
    expect(screen.getByText("Signed in as Ada")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Log out" }));
    expect(screen.getByText("Signed out")).toBeTruthy();
  });
});

describe("post-login redirects", () => {
  it("uses the requested private path when it is safe", () => {
    expect(
      getPostAuthPath({
        state: {
          from: {
            pathname: "/planner",
            search: "?week=next",
            hash: "#sessions",
          },
        },
      })
    ).toBe("/planner?week=next#sessions");
  });

  it("falls back to the dashboard for missing or unsafe paths", () => {
    expect(getPostAuthPath()).toBe("/dashboard");
    expect(getPostAuthPath({ state: { from: { pathname: "/login" } } })).toBe(
      "/dashboard"
    );
    expect(
      getPostAuthPath({ state: { from: { pathname: "//malicious.example" } } })
    ).toBe("/dashboard");
  });
});
