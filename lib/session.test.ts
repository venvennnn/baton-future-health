import { describe, expect, it } from "vitest";
import { DEMO_ACCOUNTS, USER_DEMO_ROLE, checkDemoCredentials, readSessionToken, signSession } from "./session";
import { sessionSecret } from "./session-secret";
import { loginFeedback } from "./login";

const secret = "test-session-secret-value";

describe("session token", () => {
  it("round-trips a role and rejects tampering, expiry, and malformed cookies", async () => {
    const token = await signSession("admin", secret, Date.parse("2026-01-01T00:00:00Z"));
    const session = await readSessionToken(token, secret, Date.parse("2026-01-01T01:00:00Z"));
    expect(session?.role).toBe("admin");

    const [payload, signature] = token.split(".");
    expect(await readSessionToken(`${payload}.${signature.slice(0, -1)}a`, secret)).toBeNull();
    expect(await readSessionToken(`${payload}.`, secret)).toBeNull();
    expect(await readSessionToken("not-a-token", secret)).toBeNull();
    expect(await readSessionToken(undefined, secret)).toBeNull();
    expect(await readSessionToken(token, "another-secret-value")).toBeNull();
    expect(await readSessionToken(token, secret, Date.parse("2026-01-02T00:00:00Z"))).toBeNull();
  });
});

describe("session secret", () => {
  it("uses a built-in key in production when the environment variable is unset", () => {
    const env = process.env as Record<string, string | undefined>;
    const previousNode = env.NODE_ENV;
    const previousSecret = env.BATON_SESSION_SECRET;
    env.NODE_ENV = "production";
    delete env.BATON_SESSION_SECRET;
    expect(sessionSecret().length).toBeGreaterThanOrEqual(16);
    env.BATON_SESSION_SECRET = "deployed-session-secret";
    expect(sessionSecret()).toBe("deployed-session-secret");
    env.BATON_SESSION_SECRET = "too-short";
    expect(sessionSecret()).not.toBe("too-short");
    env.NODE_ENV = previousNode;
    if (previousSecret === undefined) delete process.env.BATON_SESSION_SECRET;
    else process.env.BATON_SESSION_SECRET = previousSecret;
  });
});

describe("demo credentials", () => {
  it("accepts the printed account for the selected role only", () => {
    expect(checkDemoCredentials("user", DEMO_ACCOUNTS.user.username, DEMO_ACCOUNTS.user.password)).toBe(true);
    expect(checkDemoCredentials("admin", DEMO_ACCOUNTS.admin.username, DEMO_ACCOUNTS.admin.password)).toBe(true);
    expect(checkDemoCredentials("user", "admin", "password")).toBe(false);
    expect(checkDemoCredentials("admin", "user", "password")).toBe(false);
    expect(USER_DEMO_ROLE).toBe("user");
  });

  it("reports empty fields and a mismatch without accepting the other role", () => {
    expect(loginFeedback({ role: "user", username: "", password: "" })).toEqual({
      usernameError: "Enter the username.",
      passwordError: "Enter the password.",
    });
    expect(loginFeedback({ role: "user", username: "user", password: "" })?.passwordError).toBeTruthy();
    expect(loginFeedback({ role: "admin", username: "user", password: "password" })?.formError).toMatch(/do not match/i);
    expect(loginFeedback({ role: "user", username: " user ", password: "password" })).toBeNull();
  });
});
