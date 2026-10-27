import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthContext } from "../src/context/AuthContext";
import Login from "../src/pages/Login";
import Register from "../src/pages/Register";
import {
  loginAccount,
  registerAccount,
} from "../src/services/api";

vi.mock("../src/services/api", () => ({
  loginAccount: vi.fn(),
  registerAccount: vi.fn(),
  setAuthToken: vi.fn(),
  setUnauthorizedHandler: vi.fn(() => () => {}),
}));

function authValue(login = vi.fn()) {
  return {
    token: null,
    user: null,
    isAuthenticated: false,
    isAuthReady: true,
    login,
    logout: vi.fn(),
  };
}

function renderLogin({ login = vi.fn(), from = "/quiz" } = {}) {
  return render(
    <MemoryRouter
      initialEntries={[
        {
          pathname: "/login",
          state: { from: { pathname: from, search: "", hash: "" } },
        },
      ]}
    >
      <AuthContext.Provider value={authValue(login)}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/quiz" element={<p>Quiz destination</p>} />
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>
  );
}

function renderRegister({ login = vi.fn() } = {}) {
  return render(
    <MemoryRouter initialEntries={["/register"]}>
      <AuthContext.Provider value={authValue(login)}>
        <Routes>
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<p>Dashboard destination</p>} />
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("login page", () => {
  it("submits normalized credentials, stores the session, and redirects", async () => {
    const user = userEvent.setup();
    const login = vi.fn();
    const userRecord = { id: "user-1", name: "Ada" };
    loginAccount.mockResolvedValue({
      data: { token: "token", user: userRecord },
    });

    renderLogin({ login });

    const passwordInput = screen.getByLabelText("Password");
    expect(passwordInput.type).toBe("password");

    await user.type(screen.getByLabelText("Email address"), "ADA@EXAMPLE.COM");
    await user.type(passwordInput, "SecurePass123!");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(loginAccount).toHaveBeenCalledWith({
        email: "ada@example.com",
        password: "SecurePass123!",
      });
    });
    expect(login).toHaveBeenCalledWith({
      token: "token",
      user: userRecord,
    });
    expect(await screen.findByText("Quiz destination")).toBeTruthy();
  });

  it("shows a readable authentication error and stays on the form", async () => {
    const user = userEvent.setup();
    loginAccount.mockRejectedValue({
      response: {
        status: 401,
        data: { message: "Invalid email or password." },
      },
    });

    renderLogin();

    await user.type(screen.getByLabelText("Email address"), "ada@example.com");
    await user.type(screen.getByLabelText("Password"), "WrongPassword123!");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    const alert = await screen.findByRole("alert");

    expect(alert.textContent).toContain("Invalid email or password.");
    expect(screen.queryByText("Quiz destination")).toBeNull();
  });
});

describe("registration page", () => {
  it("creates an account and redirects to the dashboard", async () => {
    const user = userEvent.setup();
    const login = vi.fn();
    const userRecord = { id: "user-2", name: "Grace" };
    registerAccount.mockResolvedValue({
      data: { token: "token", user: userRecord },
    });

    renderRegister({ login });

    await user.type(screen.getByLabelText("Full name"), "  Grace Hopper  ");
    await user.type(screen.getByLabelText("Email address"), "grace@example.com");
    await user.type(screen.getByLabelText("Password"), "SecurePass123!");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => {
      expect(registerAccount).toHaveBeenCalledWith({
        name: "Grace Hopper",
        email: "grace@example.com",
        password: "SecurePass123!",
      });
    });
    expect(login).toHaveBeenCalledWith({
      token: "token",
      user: userRecord,
    });
    expect(await screen.findByText("Dashboard destination")).toBeTruthy();
  });
});
