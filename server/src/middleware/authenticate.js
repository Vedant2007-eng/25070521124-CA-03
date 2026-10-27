import mongoose from "mongoose";
import User from "../models/User.js";
import { verifyAccessToken } from "../utils/tokens.js";

const AUTHENTICATION_ERROR = "Authentication required.";

function getBearerToken(header) {
  if (typeof header !== "string") {
    return null;
  }

  const match = header.match(/^Bearer ([^\s]+)$/i);
  return match ? match[1] : null;
}

export default async function authenticate(req, res, next) {
  const token = getBearerToken(req.headers.authorization);

  if (!token) {
    return res.status(401).json({
      success: false,
      message: AUTHENTICATION_ERROR,
    });
  }

  let payload;

  try {
    payload = verifyAccessToken(token);
  } catch {
    return res.status(401).json({
      success: false,
      message: AUTHENTICATION_ERROR,
    });
  }

  if (
    !payload ||
    typeof payload.sub !== "string" ||
    !mongoose.isValidObjectId(payload.sub)
  ) {
    return res.status(401).json({
      success: false,
      message: AUTHENTICATION_ERROR,
    });
  }

  try {
    const user = await User.findById(payload.sub).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: AUTHENTICATION_ERROR,
      });
    }

    req.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
}
