/**
 * Authentication and Whitelist Middleware
 *
 * 1. Automatically whitelists requests coming from your internal domains and their subdomains:
 *    - *.sovraniche.com (sovraniche.com, beta.sovraniche.com, etc.)
 *    - *.ezabay.com (ezabay.com, hive.ezabay.com, hives.ezabay.com, beta.ezabay.com, etc.)
 *    - *.adesojisouljay.com (adesojisouljay.com, huminer.adesojisouljay.com, etc.)
 *    - localhost (only in development)
 *
 * 2. If the request is not from a whitelisted domain (e.g. external app, cURL, third-party backend),
 *    it requires a valid API key passed in `x-api-key`, `Authorization: Bearer <key>`, or `?apiKey=`.
 */

const WHITELISTED_DOMAINS = [
  "sovraniche.com",
  "ezabay.com",
  "adesojisouljay.com"
];

// Pre-configured valid API keys
const VALID_API_KEYS = new Set([
  process.env.PARTNER_API_KEY || "7e6e550b34ac3ed86599d2fc8478594a",
  process.env.INTERNAL_API_KEY || "breakaway_secure_dev_key"
]);

// Allow additional keys to be added via comma-separated string in .env
if (process.env.API_KEYS) {
  process.env.API_KEYS.split(",").forEach(k => {
    const trimmed = k.trim();
    if (trimmed) VALID_API_KEYS.add(trimmed);
  });
}

function isWhitelisted(originOrReferer) {
  if (!originOrReferer) return false;
  try {
    const url = new URL(originOrReferer);
    const hostname = url.hostname.toLowerCase();

    // Allow localhost in development
    if (process.env.NODE_ENV !== "production" || process.env.ALLOW_LOCALHOST === "true") {
      if (hostname === "localhost" || hostname === "127.0.0.1") {
        return true;
      }
    }

    // Match exact domain or any subdomains (*.domain.com)
    return WHITELISTED_DOMAINS.some(domain => 
      hostname === domain || hostname.endsWith("." + domain)
    );
  } catch {
    return false;
  }
}

export const authenticateRequest = (req, res, next) => {
  // Always allow CORS preflight requests
  if (req.method === "OPTIONS") {
    return next();
  }

  // Always allow diagnostic ping endpoint
  if (req.path === "/ping") {
    return next();
  }

  const origin = req.headers.origin || req.headers.referer;

  // 1. Check if the request comes from our whitelisted domains
  if (isWhitelisted(origin)) {
    return next();
  }

  // 2. Check for API key (in x-api-key header, Authorization Bearer, or query parameter)
  const apiKey = 
    req.headers["x-api-key"] || 
    req.query.apiKey || 
    (req.headers.authorization ? req.headers.authorization.replace(/^Bearer\s+/i, "") : null);

  if (apiKey && VALID_API_KEYS.has(apiKey)) {
    req.apiKey = apiKey;
    return next();
  }

  // 3. Reject unauthorized access
  return res.status(401).json({
    success: false,
    message: "Unauthorized. This endpoint requires a valid API key or must originate from an authorized domain.",
    error: "INVALID_OR_MISSING_API_KEY"
  });
};
