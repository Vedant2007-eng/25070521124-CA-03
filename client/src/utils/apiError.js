export function getApiErrorMessage(
  error,
  fallback = "Something went wrong. Please try again."
) {
  const message = error?.response?.data?.message;

  if (typeof message === "string" && message.trim()) {
    return message;
  }

  if (error?.code === "ECONNABORTED") {
    return "The request timed out. Please try again.";
  }

  if (!error?.response) {
    return "Unable to reach the server. Check your connection and try again.";
  }

  return fallback;
}
