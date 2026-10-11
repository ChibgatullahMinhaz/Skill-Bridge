import assert from "node:assert/strict";
import { test } from "node:test";
import { APIError } from "better-auth/api";
import { assertRoleUnchanged, registrationRoleSchema, validateRegistrationRole } from "./auth-policy";

test("registration accepts only student and tutor roles", () => {
  for (const role of ["STUDENT", "TUTOR"]) {
    assert.equal(validateRegistrationRole(role), role);
    assert.equal(registrationRoleSchema.parse(role), role);
  }
});

test("registration rejects admin, legacy and malformed roles", () => {
  for (const role of ["ADMIN", "CUSTOMER", "PROVIDER", "student", "", null, undefined, 1, {}]) {
    assert.equal(registrationRoleSchema.safeParse(role).success, false);
    assert.throws(() => validateRegistrationRole(role), APIError);
  }
});

test("profile updates cannot switch roles or promote an account", () => {
  for (const currentRole of ["STUDENT", "TUTOR", "ADMIN", "CUSTOMER", "PROVIDER"]) {
    assert.doesNotThrow(() => assertRoleUnchanged(currentRole, undefined));
    assert.doesNotThrow(() => assertRoleUnchanged(currentRole, currentRole));
    for (const requestedRole of ["STUDENT", "TUTOR", "ADMIN", null, ""]) {
      if (requestedRole !== currentRole) {
        assert.throws(() => assertRoleUnchanged(currentRole, requestedRole), APIError);
      }
    }
  }
});
