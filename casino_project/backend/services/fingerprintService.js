const crypto = require("crypto");

const FINGERPRINT_VERSION = 1;

function sortObjectKeys(value) {
  if (Array.isArray(value)) {
    return value.map(sortObjectKeys);
  }

  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [
          key,
          sortObjectKeys(value[key]),
        ]),
    );
  }

  return value;
}

function createFingerprint(requestData) {
  const normalizedData = sortObjectKeys({
    fingerprintVersion: FINGERPRINT_VERSION,
    requestData,
  });

  return crypto
    .createHash("sha256")
    .update(JSON.stringify(normalizedData))
    .digest("hex");
}

function verifyRequestFingerprint(
  savedFingerprint,
  requestFingerprint,
) {
  if (
    typeof savedFingerprint !== "string" ||
    typeof requestFingerprint !== "string" ||
    savedFingerprint !== requestFingerprint
  ) {
    const error = new Error(
      "A kérésazonosítót már másik játékkéréshez használták.",
    );

    error.statusCode = 409;
    throw error;
  }
}

module.exports = {
  FINGERPRINT_VERSION,
  createFingerprint,
  verifyRequestFingerprint,
};