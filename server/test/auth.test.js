import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { after, before, test } from "node:test";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import {
  JWT_ALGORITHM,
  JWT_AUDIENCE,
  JWT_ISSUER,
} from "../src/config/auth.js";

const runId = randomBytes(6).toString("hex");
const allowedOrigin = "http://localhost:5173";
const privateNetworkOrigin = "http://10.254.87.233:5173";
const testMongoUri =
  process.env.MONGODB_TEST_URI ||
  "mongodb://127.0.0.1:27017/preppilot_ai_auth_test";

process.env.NODE_ENV = "test";
process.env.CLIENT_URL = allowedOrigin;
process.env.AUTH_RATE_LIMIT = "1000";
process.env.JWT_SECRET = randomBytes(48).toString("hex");

const createdEmails = new Set();
let emailCounter = 0;
let app;
let User;
let server;
let baseUrl;

function makeEmail(label) {
  emailCounter += 1;
  const email = `auth-test-${runId}-${label}-${emailCounter}@example.com`;
  createdEmails.add(email);
  return email;
}

async function apiRequest(
  path,
  { method = "GET", body, token, headers = {} } = {}
) {
  const requestHeaders = {
    Origin: allowedOrigin,
    ...headers,
  };

  if (body !== undefined) {
    requestHeaders["Content-Type"] = "application/json";
  }

  if (token) {
    requestHeaders.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: requestHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await response.text();
  let data = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  return {
    status: response.status,
    headers: response.headers,
    body: data,
    text,
  };
}

function registerBody(label, overrides = {}) {
  return {
    name: "Auth Test User",
    email: makeEmail(label),
    password: "SecurePass123!",
    ...overrides,
  };
}

async function registerUser(label, overrides = {}) {
  const payload = registerBody(label, overrides);
  const response = await apiRequest("/api/auth/register", {
    method: "POST",
    body: payload,
  });

  assert.equal(response.status, 201);
  return { payload, response };
}

function expiredTokenFor(userId) {
  return jwt.sign({}, process.env.JWT_SECRET, {
    algorithm: JWT_ALGORITHM,
    audience: JWT_AUDIENCE,
    expiresIn: -1,
    issuer: JWT_ISSUER,
    subject: String(userId),
  });
}

before(async () => {
  const databaseName = decodeURIComponent(
    new URL(testMongoUri).pathname.replace(/^\/+/, "").split("/")[0]
  );

  assert.match(
    databaseName,
    /(^|[-_])test([-_]|$)/i,
    "MONGODB_TEST_URI must point to a dedicated test database."
  );

  await mongoose.connect(testMongoUri, {
    serverSelectionTimeoutMS: 5000,
  });

  ({ default: app } = await import("../src/app.js"));
  ({ default: User } = await import("../src/models/User.js"));

  await User.init();

  await new Promise((resolve, reject) => {
    server = app.listen(0, "127.0.0.1", resolve);
    server.once("error", reject);
  });

  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  if (User) {
    await User.deleteMany({
      email: { $in: [...createdEmails] },
    });
  }

  if (server) {
    await new Promise((resolve) => {
      server.close(resolve);
      server.closeAllConnections?.();
    });
  }

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
});

test("registration creates a normalized, hashed, token-backed account", async () => {
  const password = "SecurePass123!";
  const payload = registerBody("successful-registration", {
    name: "  Ada Lovelace  ",
    email: makeEmail("normalized-email").toUpperCase(),
    password,
    educationLevel: "Undergraduate",
    examTarget: "Computer Science",
    dailyStudyHours: 3.5,
    preferredStudyTime: "Evening",
    role: "admin",
  });
  const email = payload.email.toLowerCase();

  const response = await apiRequest("/api/auth/register", {
    method: "POST",
    body: payload,
  });

  assert.equal(response.status, 201);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("x-frame-options"), "DENY");
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.ok(Number(response.headers.get("x-ratelimit-limit")) > 0);
  assert.equal(response.body.success, true);
  assert.equal(typeof response.body.token, "string");
  assert.equal(response.body.token.split(".").length, 3);
  assert.equal(response.body.user.name, "Ada Lovelace");
  assert.equal(response.body.user.email, email);
  assert.equal(response.body.user.role, undefined);
  assert.equal(response.body.user.password, undefined);

  const serializedResponse = JSON.stringify(response.body);
  assert.doesNotMatch(serializedResponse, /\$2[aby]\$/);
  assert.doesNotMatch(serializedResponse, new RegExp(password));

  const storedUser = await User.findOne({ email }).select("+password").lean();

  assert.ok(storedUser);
  assert.notEqual(storedUser.password, password);
  assert.match(storedUser.password, /^\$2[aby]\$12\$/);
  assert.equal(await bcrypt.compare(password, storedUser.password), true);
  assert.equal(storedUser.role, undefined);

  const decodedToken = jwt.decode(response.body.token);

  assert.equal(decodedToken.sub, response.body.user.id);
  assert.equal(decodedToken.email, undefined);
  assert.equal(decodedToken.name, undefined);
});

test("registration rejects missing and invalid fields without creating users", async () => {
  const cases = [
    {
      label: "missing-name",
      body: {
        email: makeEmail("missing-name"),
        password: "SecurePass123!",
      },
    },
    {
      label: "invalid-email",
      body: {
        name: "Auth Test",
        email: "not-an-email",
        password: "SecurePass123!",
      },
    },
    {
      label: "short-password",
      body: {
        name: "Auth Test",
        email: makeEmail("short-password"),
        password: "short",
      },
    },
    {
      label: "space-only-password",
      body: {
        name: "Auth Test",
        email: makeEmail("space-only-password"),
        password: "        ",
      },
    },
    {
      label: "password-too-many-bytes",
      body: {
        name: "Auth Test",
        email: makeEmail("password-too-many-bytes"),
        password: "😀".repeat(19),
      },
    },
    {
      label: "non-string-name",
      body: {
        name: 42,
        email: makeEmail("non-string-name"),
        password: "SecurePass123!",
      },
    },
    {
      label: "non-string-email",
      body: {
        name: "Auth Test",
        email: { value: "test@example.com" },
        password: "SecurePass123!",
      },
    },
    {
      label: "non-string-password",
      body: {
        name: "Auth Test",
        email: makeEmail("non-string-password"),
        password: 12345678,
      },
    },
    {
      label: "invalid-study-hours",
      body: {
        name: "Auth Test",
        email: makeEmail("invalid-study-hours"),
        password: "SecurePass123!",
        dailyStudyHours: 25,
      },
    },
  ];

  for (const { body } of cases) {
    const response = await apiRequest("/api/auth/register", {
      method: "POST",
      body,
    });

    assert.equal(response.status, 400);
    assert.equal(response.body.success, false);
    assert.equal(typeof response.body.message, "string");
    assert.equal(response.body.stack, undefined);
  }

  const matchingEmails = cases
    .map(({ body }) => body.email)
    .filter((email) => typeof email === "string" && email.includes("@"));

  assert.equal(
    await User.countDocuments({ email: { $in: matchingEmails } }),
    0
  );
});

test("duplicate and concurrent registrations return HTTP 409", async () => {
  const payload = registerBody("duplicate-email");
  const email = payload.email;

  const first = await apiRequest("/api/auth/register", {
    method: "POST",
    body: payload,
  });
  const duplicate = await apiRequest("/api/auth/register", {
    method: "POST",
    body: {
      ...payload,
      email: `  ${email.toUpperCase()}  `,
    },
  });

  assert.equal(first.status, 201);
  assert.equal(duplicate.status, 409);
  assert.equal(duplicate.body.success, false);
  assert.equal(duplicate.body.token, undefined);

  const racePayload = registerBody("concurrent-race");
  const responses = await Promise.all([
    apiRequest("/api/auth/register", {
      method: "POST",
      body: racePayload,
    }),
    apiRequest("/api/auth/register", {
      method: "POST",
      body: racePayload,
    }),
  ]);

  assert.deepEqual(
    responses.map((response) => response.status).sort(),
    [201, 409]
  );
  assert.equal(await User.countDocuments({ email: racePayload.email }), 1);
});

test("login accepts normalized credentials and returns a safe user", async () => {
  const { payload } = await registerUser("login-success");
  const response = await apiRequest("/api/auth/login", {
    method: "POST",
    body: {
      email: ` ${payload.email.toUpperCase()} `,
      password: payload.password,
    },
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(typeof response.body.token, "string");
  assert.equal(response.body.user.email, payload.email);
  assert.equal(response.body.user.password, undefined);
  assert.doesNotMatch(JSON.stringify(response.body), /\$2[aby]\$/);
});

test("unknown email and incorrect password share a generic 401 response", async () => {
  const { payload } = await registerUser("login-failures");

  const wrongPassword = await apiRequest("/api/auth/login", {
    method: "POST",
    body: {
      email: payload.email,
      password: "WrongPassword123!",
    },
  });
  const unknownEmail = await apiRequest("/api/auth/login", {
    method: "POST",
    body: {
      email: makeEmail("unknown-login"),
      password: "WrongPassword123!",
    },
  });

  assert.equal(wrongPassword.status, 401);
  assert.equal(unknownEmail.status, 401);
  assert.equal(wrongPassword.body.message, unknownEmail.body.message);
  assert.equal(wrongPassword.body.message, "Invalid email or password.");
  assert.equal(wrongPassword.body.token, undefined);
  assert.equal(unknownEmail.body.token, undefined);
  assert.doesNotMatch(wrongPassword.text, /Mongo|E11000|\$2[aby]\$/);
  assert.doesNotMatch(unknownEmail.text, /Mongo|E11000|\$2[aby]\$/);
});

test("login rejects malformed request bodies", async () => {
  for (const body of [{}, { email: "not-an-email", password: "x" }, null]) {
    const response = await apiRequest("/api/auth/login", {
      method: "POST",
      body,
    });

    assert.equal(response.status, 400);
    assert.equal(response.body.success, false);
    assert.equal(response.body.token, undefined);
  }
});

test("/api/auth/me returns the authenticated user and ignores body identity", async () => {
  const { payload, response: registration } =
    await registerUser("current-user");
  const { token } = registration.body;

  const currentUser = await apiRequest("/api/auth/me", { token });

  assert.equal(currentUser.status, 200);
  assert.equal(currentUser.body.success, true);
  assert.equal(currentUser.body.user.email, payload.email);
  assert.equal(currentUser.body.user.password, undefined);
  assert.doesNotMatch(currentUser.text, /\$2[aby]\$/);

  const queryIdentityOnly = await apiRequest(
    `/api/auth/me?id=${currentUser.body.user.id}`
  );

  assert.equal(queryIdentityOnly.status, 401);
});

test("/api/auth/me rejects missing, malformed, invalid, and expired tokens", async () => {
  const { response: registration } = await registerUser("token-errors");
  const userId = registration.body.user.id;

  const noToken = await apiRequest("/api/auth/me");
  const malformed = await apiRequest("/api/auth/me", {
    headers: { Authorization: "Bearer not-a-jwt" },
  });
  const wrongScheme = await apiRequest("/api/auth/me", {
    headers: { Authorization: `Basic ${registration.body.token}` },
  });

  const wrongSignatureToken = jwt.sign({}, randomBytes(48).toString("hex"), {
    algorithm: JWT_ALGORITHM,
    audience: JWT_AUDIENCE,
    expiresIn: "1h",
    issuer: JWT_ISSUER,
    subject: userId,
  });
  const wrongSignature = await apiRequest("/api/auth/me", {
    token: wrongSignatureToken,
  });

  const expired = await apiRequest("/api/auth/me", {
    token: expiredTokenFor(userId),
  });

  const invalidSubjectToken = jwt.sign({}, process.env.JWT_SECRET, {
    algorithm: JWT_ALGORITHM,
    audience: JWT_AUDIENCE,
    expiresIn: "1h",
    issuer: JWT_ISSUER,
    subject: "not-an-object-id",
  });
  const invalidSubject = await apiRequest("/api/auth/me", {
    token: invalidSubjectToken,
  });

  for (const response of [
    noToken,
    malformed,
    wrongScheme,
    wrongSignature,
    expired,
    invalidSubject,
  ]) {
    assert.equal(response.status, 401);
    assert.equal(response.body.success, false);
    assert.equal(response.body.user, undefined);
    assert.equal(response.body.message, "Authentication required.");
  }

  assert.equal(noToken.body.stack, undefined);
});

test("/api/auth/me rejects tokens for users that no longer exist", async () => {
  const { response: registration } = await registerUser("deleted-user");
  const userId = registration.body.user.id;

  await User.deleteOne({ _id: userId });

  const response = await apiRequest("/api/auth/me", {
    token: registration.body.token,
  });

  assert.equal(response.status, 401);
  assert.equal(response.body.success, false);
  assert.equal(response.body.user, undefined);
});

test("CORS permits the configured origin and rejects arbitrary origins", async () => {
  const allowed = await apiRequest("/api/health");
  const disallowed = await apiRequest("/api/health", {
    headers: { Origin: "http://malicious.example" },
  });

  assert.equal(allowed.status, 200);
  assert.equal(
    allowed.headers.get("access-control-allow-origin"),
    allowedOrigin
  );
  assert.equal(
    allowed.headers.get("access-control-allow-credentials"),
    "true"
  );

  assert.equal(disallowed.headers.get("access-control-allow-origin"), null);
  assert.notEqual(
    disallowed.headers.get("access-control-allow-origin"),
    "*"
  );

  const preflight = await apiRequest("/api/health", {
    method: "OPTIONS",
    headers: {
      Origin: allowedOrigin,
      "Access-Control-Request-Method": "GET",
    },
  });

  assert.equal(
    preflight.headers.get("access-control-allow-origin"),
    allowedOrigin
  );

  const privatePreflight = await apiRequest("/api/auth/register", {
    method: "OPTIONS",
    headers: {
      Origin: privateNetworkOrigin,
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "content-type",
    },
  });

  assert.equal(privatePreflight.status, 204);
  assert.equal(
    privatePreflight.headers.get("access-control-allow-origin"),
    privateNetworkOrigin
  );
  assert.equal(
    privatePreflight.headers.get("access-control-allow-credentials"),
    "true"
  );
  assert.match(
    privatePreflight.headers.get("access-control-allow-methods"),
    /POST/
  );

  const privateRegistration = await apiRequest("/api/auth/register", {
    method: "POST",
    body: registerBody("private-network-cors"),
    headers: { Origin: privateNetworkOrigin },
  });

  assert.equal(privateRegistration.status, 201);
  assert.equal(
    privateRegistration.headers.get("access-control-allow-origin"),
    privateNetworkOrigin
  );
  assert.equal(
    privateRegistration.headers.get("access-control-allow-credentials"),
    "true"
  );

  const privateHttps = await apiRequest("/api/health", {
    headers: { Origin: "https://10.254.87.233:5173" },
  });

  assert.equal(privateHttps.headers.get("access-control-allow-origin"), null);
});
