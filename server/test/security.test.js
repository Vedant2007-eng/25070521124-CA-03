import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { test } from "node:test";
import jwt from "jsonwebtoken";
import {
  JWT_ALGORITHM,
  JWT_AUDIENCE,
  JWT_EXPIRES_IN_SECONDS,
  JWT_ISSUER,
  validateJwtSecret,
} from "../src/config/auth.js";
import { createAuthRateLimiter } from "../src/middleware/authRateLimit.js";
import {
  signAccessToken,
  verifyAccessToken,
} from "../src/utils/tokens.js";

const execFileAsync = promisify(execFile);
const serverRoot = fileURLToPath(new URL("../", import.meta.url));
const strongSecret = randomBytes(48).toString("hex");
process.env.JWT_SECRET = strongSecret;

test("JWT secret validation rejects missing, short, and placeholder values", () => {
  for (const value of [
    undefined,
    "",
    "short-secret",
    "replace_with_a_long_random_secret",
    "changeme",
    "a".repeat(64),
  ]) {
    assert.equal(validateJwtSecret(value).valid, false);
  }
});

test("JWT secret validation accepts a strong random secret", () => {
  const result = validateJwtSecret(strongSecret);
  assert.equal(result.valid, true);
  assert.equal(result.value, strongSecret);
});

test("access tokens use safe claims and the expected settings", () => {
  const userId = "507f1f77bcf86cd799439011";
  const token = signAccessToken(userId);
  const decoded = jwt.decode(token, { complete: true });

  assert.equal(decoded.header.alg, JWT_ALGORITHM);
  assert.equal(decoded.payload.sub, userId);
  assert.equal(decoded.payload.iss, JWT_ISSUER);
  assert.equal(decoded.payload.aud, JWT_AUDIENCE);
  assert.equal(
    decoded.payload.exp - decoded.payload.iat,
    JWT_EXPIRES_IN_SECONDS
  );
  assert.deepEqual(Object.keys(decoded.payload).sort(), [
    "aud",
    "exp",
    "iat",
    "iss",
    "sub",
  ]);

  const verified = verifyAccessToken(token);
  assert.equal(verified.sub, userId);
  assert.equal(verified.email, undefined);
  assert.equal(verified.name, undefined);
});

test("token verification rejects wrong signatures, algorithms, and expiry", () => {
  const userId = "507f1f77bcf86cd799439011";

  const wrongSecretToken = jwt.sign({}, randomBytes(48).toString("hex"), {
    algorithm: JWT_ALGORITHM,
    audience: JWT_AUDIENCE,
    expiresIn: "1h",
    issuer: JWT_ISSUER,
    subject: userId,
  });

  const wrongAlgorithmToken = jwt.sign({}, strongSecret, {
    algorithm: "HS384",
    audience: JWT_AUDIENCE,
    expiresIn: "1h",
    issuer: JWT_ISSUER,
    subject: userId,
  });

  const expiredToken = jwt.sign({}, strongSecret, {
    algorithm: JWT_ALGORITHM,
    audience: JWT_AUDIENCE,
    expiresIn: -1,
    issuer: JWT_ISSUER,
    subject: userId,
  });

  assert.throws(() => verifyAccessToken(wrongSecretToken));
  assert.throws(() => verifyAccessToken(wrongAlgorithmToken));
  assert.throws(() => verifyAccessToken(expiredToken));
  assert.throws(() => verifyAccessToken("not-a-jwt"));
});

test("auth rate limiting blocks repeated attempts and resets per window", () => {
  let currentTime = 1_000_000;
  let allowed = 0;
  const limiter = createAuthRateLimiter({
    limit: 2,
    windowMs: 1000,
    now: () => currentTime,
  });

  function createResponse() {
    return {
      headers: {},
      statusCode: 200,
      body: null,
      set(name, value) {
        this.headers[name] = value;
        return this;
      },
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(body) {
        this.body = body;
        return this;
      },
    };
  }

  const request = { ip: "203.0.113.10" };

  limiter(request, createResponse(), () => {
    allowed += 1;
  });
  limiter(request, createResponse(), () => {
    allowed += 1;
  });

  const blocked = createResponse();
  limiter(request, blocked, () => {
    allowed += 1;
  });

  assert.equal(allowed, 2);
  assert.equal(blocked.statusCode, 429);
  assert.equal(blocked.body.reason, "auth_rate_limited");
  assert.ok(Number(blocked.headers["Retry-After"]) >= 1);

  currentTime += 1000;

  limiter(request, createResponse(), () => {
    allowed += 1;
  });
  assert.equal(allowed, 3);
});

test("startup fails safely when JWT_SECRET is missing", async () => {
  await assert.rejects(
    execFileAsync(process.execPath, ["src/server.js"], {
      cwd: serverRoot,
      env: {
        ...process.env,
        JWT_SECRET: "",
      },
      timeout: 10000,
      windowsHide: true,
    }),
    (error) => {
      assert.equal(error.code, 1);
      assert.match(error.stderr, /JWT_SECRET is required/);
      assert.doesNotMatch(error.stderr, new RegExp(strongSecret));
      return true;
    }
  );
});
