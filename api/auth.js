export const config = { runtime: "edge" };

export default async function handler(req) {
  const authHeader = req.headers.get("authorization");

  if (authHeader) {
    try {
      const [scheme, encoded] = authHeader.split(" ");
      if (scheme === "Basic") {
        const [user, pass] = atob(encoded).split(":");
        if (
          user === process.env.BASIC_AUTH_USER &&
          pass === process.env.BASIC_AUTH_PASS
        ) {
          // ✅ Auth correct → serve the original static file
          return fetch(req);
        }
      }
    } catch (err) {}
  }

  // ❌ No or wrong auth → send browser challenge
  return new Response("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Secure Area", charset="UTF-8"' }
  });
}