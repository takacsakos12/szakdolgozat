const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

function createUncertainResponseError(cause, statusCode) {
  const error = new Error(
    "A szerver válaszát nem sikerült feldolgozni. A művelet eredménye bizonytalan.",
  );

  error.code = "INVALID_RESPONSE";
  error.outcomeUnknown = true;
  error.statusCode = statusCode;
  error.cause = cause;

  return error;
}

async function apiRequest(path, options = {}) {
  const headers = new Headers(options.headers);

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      credentials: "include",
    });
  } catch (cause) {
    const error = new Error("Nem sikerült kapcsolódni a szerverhez.");

    error.code = "NETWORK_ERROR";
    error.outcomeUnknown = true;
    error.cause = cause;

    throw error;
  }

  const mediaType = (response.headers.get("content-type") || "")
    .split(";")[0]
    .trim()
    .toLowerCase();

  const isJson =
    mediaType === "application/json" || mediaType.endsWith("+json");

  const hasNoBody =
    response.status === 204 ||
    (options.method || "GET").toUpperCase() === "HEAD";

  let data = null;

  if (!hasNoBody && isJson) {
    try {
      data = await response.json();
    } catch (cause) {
      throw createUncertainResponseError(cause, response.status);
    }
  } else if (!hasNoBody && response.ok) {
    throw createUncertainResponseError(
      new Error("JSON helyett más formátumú válasz érkezett."),
      response.status,
    );
  }

  if (!response.ok) {
    const error = new Error(
      data?.message || "A kérés végrehajtása sikertelen.",
    );

    error.statusCode = response.status;
    error.data = data;

    throw error;
  }

  return data;
}

export { API_URL, apiRequest };
