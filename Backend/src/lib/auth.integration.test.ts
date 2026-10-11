import assert from "node:assert/strict";
import { test } from "node:test";
import { betterAuth } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";
import { auth } from "./auth";

test("native Better Auth endpoints enforce SkillBridge registration and role policy", async () => {
  const database: Record<string, Record<string, unknown>[]> = { user: [], session: [], account: [], verification: [] };
  const instance = betterAuth({
    ...auth.options,
    database: memoryAdapter(database),
    secret: "synthetic-test-secret-at-least-thirty-two-characters",
    baseURL: "http://localhost:5000",
    socialProviders: {},
    advanced: { useSecureCookies: false },
  });
  async function call(path: string, body: object, cookie = "") {
    const response = await instance.handler(new Request(`http://localhost:5000/api/auth${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "http://localhost:3000", ...(cookie && { Cookie: cookie }) },
      body: JSON.stringify(body),
    }));
    return { status: response.status, data: await response.json(),
      cookie: response.headers.getSetCookie().map(value => value.split(";")[0]).join("; ") };
  }
  const password = "Synthetic-password-for-tests!";
  for (const role of ["STUDENT", "TUTOR"]) {
    const signup = await call("/sign-up/email", { name: "Test user", email: `${role.toLowerCase()}@example.com`, password, role });
    assert.equal(signup.status, 200, JSON.stringify(signup.data));
    assert.equal(signup.data.user.role, role);
    assert.equal(signup.data.user.status, "ACTIVE");
    assert.ok(signup.cookie);
    const roleUpdate = await call("/update-user", { role: role === "STUDENT" ? "TUTOR" : "STUDENT" }, signup.cookie);
    assert.equal(roleUpdate.status, 403, JSON.stringify(roleUpdate.data));
    assert.match(roleUpdate.data.message, /role cannot be changed/);
    const nameUpdate = await call("/update-user", { name: "Updated name" }, signup.cookie);
    assert.equal(nameUpdate.status, 200, JSON.stringify(nameUpdate.data));
  }
  for (const role of ["ADMIN", "CUSTOMER", "PROVIDER", "invalid"]) {
    const signup = await call("/sign-up/email", { name: "Bad role", email: `${role.toLowerCase()}@example.com`, password, role });
    assert.equal(signup.status, 400);
  }
  const defaultUser = await call("/sign-up/email", { name: "Default student", email: "default@example.com", password });
  assert.equal(defaultUser.status, 200);
  assert.equal(defaultUser.data.user.role, "STUDENT");
  const user = database.user?.find(user => user.email === "default@example.com");
  assert.ok(user);
  user.status = "BLOCKED";
  assert.equal((await call("/sign-in/email", { email: "default@example.com", password })).status, 403);
  user.status = "SUSPENDED";
  assert.equal((await call("/sign-in/email", { email: "default@example.com", password })).status, 403);
  user.status = "ACTIVE";
  assert.equal((await call("/sign-in/email", { email: "default@example.com", password })).status, 200);
});
