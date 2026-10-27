import mongoose from "mongoose";

export function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function isValidObjectId(value) {
  return mongoose.isObjectIdOrHexString(value);
}

export function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

export function normalizeText(value) {
  return value.trim();
}
