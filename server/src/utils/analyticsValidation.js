const ALLOWED_QUERY_FIELDS = new Set(["page", "limit"]);

function parseWholeNumber(value, fallback, { min, max, label }) {
  if (value === undefined) {
    return { value: fallback };
  }

  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    return { error: `${label} must be a whole number.` };
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    return { error: `${label} must be between ${min} and ${max}.` };
  }

  return { value: parsed };
}

export function validateAnalyticsPaginationQuery(query = {}) {
  const unknownField = Object.keys(query).find(
    (field) => !ALLOWED_QUERY_FIELDS.has(field)
  );

  if (unknownField) {
    return {
      error: `The "${unknownField}" query parameter is not supported.`,
    };
  }

  const page = parseWholeNumber(query.page, 1, {
    min: 1,
    max: 1000000,
    label: "Page",
  });

  if (page.error) {
    return page;
  }

  const limit = parseWholeNumber(query.limit, 10, {
    min: 1,
    max: 50,
    label: "Limit",
  });

  if (limit.error) {
    return limit;
  }

  return {
    data: {
      page: page.value,
      limit: limit.value,
    },
  };
}
