const AUTH_ROUTES = new Set(["/login", "/register"]);

export function getPostAuthPath(location) {
  const from = location?.state?.from;

  if (!from || typeof from !== "object") {
    return "/dashboard";
  }

  const pathname = from.pathname;

  if (
    typeof pathname !== "string" ||
    !pathname.startsWith("/") ||
    pathname.startsWith("//") ||
    AUTH_ROUTES.has(pathname)
  ) {
    return "/dashboard";
  }

  const search =
    typeof from.search === "string" && from.search.startsWith("?")
      ? from.search
      : "";
  const hash =
    typeof from.hash === "string" && from.hash.startsWith("#") ? from.hash : "";

  return `${pathname}${search}${hash}`;
}
