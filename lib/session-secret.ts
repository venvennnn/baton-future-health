/**
 * Signs the demo session cookie. An environment variable overrides this.
 * The built-in value keeps the public demo usable when the host has no env configured.
 * It is imported only from server code.
 */
const DEMO_SESSION_SECRET = "baton-public-demo-session-signing-key-v1";

export function sessionSecret(): string {
  const value = process.env.BATON_SESSION_SECRET?.trim();
  if (value && value.length >= 16) return value;
  return DEMO_SESSION_SECRET;
}
