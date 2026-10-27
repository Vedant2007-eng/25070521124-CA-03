import { afterEach, describe, expect, it, vi } from "vitest";
import api, {
  setAuthToken,
  setUnauthorizedHandler,
} from "../src/services/api";

let clearHandler = null;

function adapterFor({ status, onRequest }) {
  return (config) => {
    onRequest?.(config);

    if (status >= 200 && status < 300) {
      return Promise.resolve({
        config,
        data: { success: true },
        headers: {},
        status,
        statusText: "OK",
      });
    }

    return Promise.reject({
      config,
      response: {
        config,
        data: { success: false },
        headers: {},
        status,
        statusText: "Error",
      },
    });
  };
}

afterEach(() => {
  clearHandler?.();
  clearHandler = null;
  setAuthToken(null);
});

describe("API authentication handling", () => {
  it("attaches the in-memory token to requests", async () => {
    let authorization = null;
    setAuthToken("memory-token");

    await api.get("/api/auth/me", {
      adapter: adapterFor({
        status: 200,
        onRequest: (config) => {
          authorization = config.headers.get("Authorization");
        },
      }),
    });

    expect(authorization).toBe("Bearer memory-token");
  });

  it("clears authentication and notifies on protected 401 responses", async () => {
    const unauthorized = vi.fn();
    clearHandler = setUnauthorizedHandler(unauthorized);
    setAuthToken("expired-token");

    await expect(
      api.get("/api/auth/me", {
        adapter: adapterFor({ status: 401 }),
      })
    ).rejects.toBeTruthy();

    expect(unauthorized).toHaveBeenCalledTimes(1);

    let authorization = "unexpected";
    await api.get("/api/health", {
      adapter: adapterFor({
        status: 200,
        onRequest: (config) => {
          authorization = config.headers.get("Authorization") || null;
        },
      }),
    });

    expect(authorization).toBeNull();
  });

  it("does not clear authentication for unrelated server errors", async () => {
    const unauthorized = vi.fn();
    clearHandler = setUnauthorizedHandler(unauthorized);
    setAuthToken("valid-token");

    await expect(
      api.get("/api/health", {
        adapter: adapterFor({ status: 500 }),
      })
    ).rejects.toBeTruthy();

    expect(unauthorized).not.toHaveBeenCalled();

    let authorization = null;
    await api.get("/api/health", {
      adapter: adapterFor({
        status: 200,
        onRequest: (config) => {
          authorization = config.headers.get("Authorization");
        },
      }),
    });

    expect(authorization).toBe("Bearer valid-token");
  });
});
