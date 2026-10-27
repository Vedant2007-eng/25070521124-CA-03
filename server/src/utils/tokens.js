import jwt from "jsonwebtoken";
import {
  getJwtSecret,
  JWT_ALGORITHM,
  JWT_AUDIENCE,
  JWT_EXPIRES_IN_SECONDS,
  JWT_ISSUER,
} from "../config/auth.js";

export function signAccessToken(userId) {
  return jwt.sign({}, getJwtSecret(), {
    algorithm: JWT_ALGORITHM,
    audience: JWT_AUDIENCE,
    expiresIn: JWT_EXPIRES_IN_SECONDS,
    issuer: JWT_ISSUER,
    subject: String(userId),
  });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, getJwtSecret(), {
    algorithms: [JWT_ALGORITHM],
    audience: JWT_AUDIENCE,
    issuer: JWT_ISSUER,
  });
}
