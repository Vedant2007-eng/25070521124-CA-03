import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import User from "../models/User.js";
import {
  validateLoginInput,
  validateRegistrationInput,
} from "../utils/authValidation.js";
import { asyncHandler } from "../utils/http.js";
import { serializeUser } from "../utils/serializeUser.js";
import { signAccessToken } from "../utils/tokens.js";

const PASSWORD_SALT_ROUNDS = 12;
const DUMMY_PASSWORD_HASH =
  "$2b$12$wmZMJnGt8PmDeMPRrD7Q/u9Wd95ntzjIKLdULZmDGPg7TxfljaHd6";
const DUPLICATE_EMAIL_MESSAGE = "An account with this email already exists.";
const INVALID_CREDENTIALS_MESSAGE = "Invalid email or password.";

function authResponse(user) {
  return {
    token: signAccessToken(user.id),
    user: serializeUser(user),
  };
}

export const register = asyncHandler(async (req, res) => {
  const validation = validateRegistrationInput(req.body);

  if (validation.error) {
    return res.status(400).json({
      success: false,
      message: validation.error,
    });
  }

  const { data } = validation;
  const existingUser = await User.exists({ email: data.email });

  if (existingUser) {
    return res.status(409).json({
      success: false,
      message: DUPLICATE_EMAIL_MESSAGE,
    });
  }

  const passwordHash = await bcrypt.hash(data.password, PASSWORD_SALT_ROUNDS);

  try {
    const user = await User.create({
      ...data,
      password: passwordHash,
    });

    return res.status(201).json({
      success: true,
      message: "Account created.",
      ...authResponse(user),
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: DUPLICATE_EMAIL_MESSAGE,
      });
    }

    if (error instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({
        success: false,
        message: "Please check the registration details and try again.",
      });
    }

    throw error;
  }
});

export const login = asyncHandler(async (req, res) => {
  const validation = validateLoginInput(req.body);

  if (validation.error) {
    return res.status(400).json({
      success: false,
      message: validation.error,
    });
  }

  const { email, password } = validation.data;
  const user = await User.findOne({ email }).select("+password");
  const isPasswordValid = await bcrypt.compare(
    password,
    user?.password || DUMMY_PASSWORD_HASH
  );

  if (!user || !isPasswordValid) {
    return res.status(401).json({
      success: false,
      message: INVALID_CREDENTIALS_MESSAGE,
    });
  }

  return res.status(200).json({
    success: true,
    message: "Signed in.",
    ...authResponse(user),
  });
});

export function getCurrentUser(req, res) {
  return res.status(200).json({
    success: true,
    user: serializeUser(req.user),
  });
}
