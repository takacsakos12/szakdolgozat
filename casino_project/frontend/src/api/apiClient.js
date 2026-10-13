const API_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:5000/api";

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
  } catch (error) {
    const connectionError = new Error("Nem sikerült kapcsolódni a szerverhez.");

    connectionError.cause = error;
    throw connectionError;
  }

  const contentType = response.headers.get("content-type") || "";

  let data = null;

  if (contentType.includes("application/json")) {
    data = await response.json();
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
