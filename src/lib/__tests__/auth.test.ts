import { describe, test, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const mockCookieStore = {
  set: vi.fn(),
  get: vi.fn(),
};
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));

import { createSession, getSession } from "@/lib/auth";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createSession", () => {
  test("sets an httpOnly cookie with a signed JWT", async () => {
    await createSession("user-1", "user@example.com");

    expect(mockCookieStore.set).toHaveBeenCalledOnce();
    const [name, token, options] = mockCookieStore.set.mock.calls[0];

    expect(name).toBe("auth-token");
    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3); // JWT format
    expect(options.httpOnly).toBe(true);
    expect(options.path).toBe("/");
    expect(options.expires).toBeInstanceOf(Date);
  });

  test("sets cookie expiry ~7 days in the future", async () => {
    const before = Date.now();
    await createSession("user-1", "user@example.com");
    const after = Date.now();

    const { expires } = mockCookieStore.set.mock.calls[0][2];
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    expect(expires.getTime()).toBeGreaterThanOrEqual(before + sevenDaysMs - 1000);
    expect(expires.getTime()).toBeLessThanOrEqual(after + sevenDaysMs + 1000);
  });

  test("encodes userId and email in the JWT payload", async () => {
    await createSession("user-42", "hello@test.com");

    const token = mockCookieStore.set.mock.calls[0][1];
    const payloadBase64 = token.split(".")[1];
    const payload = JSON.parse(atob(payloadBase64));

    expect(payload.userId).toBe("user-42");
    expect(payload.email).toBe("hello@test.com");
  });

  test("JWT has an expiration claim (~7 days)", async () => {
    const before = Math.floor(Date.now() / 1000);
    await createSession("user-1", "user@example.com");
    const after = Math.floor(Date.now() / 1000);

    const token = mockCookieStore.set.mock.calls[0][1];
    const payload = JSON.parse(atob(token.split(".")[1]));
    const sevenDays = 7 * 24 * 60 * 60;

    expect(payload.exp).toBeGreaterThanOrEqual(before + sevenDays - 5);
    expect(payload.exp).toBeLessThanOrEqual(after + sevenDays + 5);
  });

  test("sets sameSite to lax", async () => {
    await createSession("user-1", "user@example.com");

    const options = mockCookieStore.set.mock.calls[0][2];
    expect(options.sameSite).toBe("lax");
  });

  test("secure is false outside production", async () => {
    const original = process.env.NODE_ENV;
    // NODE_ENV is "test" in vitest by default
    await createSession("user-1", "user@example.com");

    const options = mockCookieStore.set.mock.calls[0][2];
    expect(options.secure).toBe(false);
    process.env.NODE_ENV = original;
  });

  test("secure is true in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    await createSession("user-1", "user@example.com");

    const options = mockCookieStore.set.mock.calls[0][2];
    expect(options.secure).toBe(true);
    vi.unstubAllEnvs();
  });

  test("generates distinct tokens for different users", async () => {
    await createSession("user-1", "a@test.com");
    const token1 = mockCookieStore.set.mock.calls[0][1];

    vi.clearAllMocks();

    await createSession("user-2", "b@test.com");
    const token2 = mockCookieStore.set.mock.calls[0][1];

    expect(token1).not.toBe(token2);
  });
});

describe("getSession", () => {
  test("returns null when no cookie is present", async () => {
    mockCookieStore.get.mockReturnValue(undefined);

    const session = await getSession();

    expect(session).toBeNull();
  });

  test("returns null for a malformed token", async () => {
    mockCookieStore.get.mockReturnValue({ value: "not.a.valid.jwt" });

    const session = await getSession();

    expect(session).toBeNull();
  });

  test("returns null for a token signed with a different secret", async () => {
    // Build a JWT signed with a different key using jose directly
    const { SignJWT } = await import("jose");
    const wrongSecret = new TextEncoder().encode("wrong-secret");
    const token = await new SignJWT({ userId: "x", email: "x@x.com" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("7d")
      .sign(wrongSecret);

    mockCookieStore.get.mockReturnValue({ value: token });

    const session = await getSession();

    expect(session).toBeNull();
  });

  test("returns session payload for a valid token", async () => {
    let capturedToken = "";
    mockCookieStore.set.mockImplementation((_name: string, token: string) => {
      capturedToken = token;
    });
    await createSession("user-42", "hello@test.com");

    mockCookieStore.get.mockReturnValue({ value: capturedToken });

    const session = await getSession();

    expect(session).not.toBeNull();
    expect(session?.userId).toBe("user-42");
    expect(session?.email).toBe("hello@test.com");
  });

  test("returned payload contains expiresAt", async () => {
    let capturedToken = "";
    mockCookieStore.set.mockImplementation((_name: string, token: string) => {
      capturedToken = token;
    });
    await createSession("user-1", "user@example.com");

    mockCookieStore.get.mockReturnValue({ value: capturedToken });

    const session = await getSession();

    expect(session?.expiresAt).toBeDefined();
  });
});
