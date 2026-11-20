import { describe, expect, it } from "vitest";
import { canAccess, entryHref, logoutTarget, resolveDestination, roleForPath } from "./access";

describe("route access", () => {
  it("keeps case routes on the user role and facility routes on the admin role", () => {
    expect(roleForPath("/cases")).toBe("user");
    expect(roleForPath("/cases/FIT-26771")).toBe("user");
    expect(roleForPath("/facilities")).toBe("admin");
    expect(roleForPath("/simulator")).toBe("admin");
    expect(roleForPath("/governance")).toBe("admin");
    expect(roleForPath("/settings")).toBe("admin");
    expect(canAccess("user", "/settings")).toBe(false);
    expect(canAccess("admin", "/settings")).toBe(true);
    expect(roleForPath("/")).toBe("public");
    expect(roleForPath("/login")).toBe("public");
    expect(canAccess("user", "/cases/FIT-26771")).toBe(true);
    expect(canAccess("user", "/facilities")).toBe(false);
    expect(canAccess("admin", "/governance")).toBe(true);
    expect(canAccess("admin", "/cases")).toBe(false);
  });

  it("honors a permitted return path and drops open redirects", () => {
    expect(resolveDestination("user", "/cases/FIT-26771#audit")).toBe("/cases/FIT-26771#audit");
    expect(resolveDestination("admin", "/governance#safety")).toBe("/governance#safety");
    expect(resolveDestination("user", "/facilities")).toBe("/cases");
    expect(resolveDestination("admin", "/cases/FIT-26771")).toBe("/facilities");
    expect(resolveDestination("user", "https://evil.example/cases")).toBe("/cases");
    expect(resolveDestination("admin", "//evil.example")).toBe("/facilities");
    expect(resolveDestination("user", "/\\evil.example")).toBe("/cases");
    expect(resolveDestination("admin", "/facilities/../cases")).toBe("/facilities");
    expect(resolveDestination("user", "/%2F%2Fevil.example")).toBe("/cases");
    expect(logoutTarget("https://evil.example")).toBe("/");
    expect(logoutTarget("//evil.example")).toBe("/");
    expect(logoutTarget("/login?role=admin&next=/facilities")).toBe("/login?role=admin&next=%2Ffacilities");
    expect(logoutTarget("/login?role=admin&next=https://evil.example")).toBe("/");
  });

  it("sends a logged-out or wrong-role visitor through the matching login", () => {
    expect(entryHref(null, "/cases")).toBe("/login?role=user&next=%2Fcases");
    expect(entryHref(null, "/cases/FIT-26771")).toBe("/login?role=user&next=%2Fcases%2FFIT-26771");
    expect(entryHref(null, "/simulator")).toBe("/login?role=admin&next=%2Fsimulator");
    expect(entryHref("user", "/cases/FIT-26771")).toBe("/cases/FIT-26771");
    expect(entryHref("admin", "/facilities")).toBe("/facilities");
    expect(entryHref("admin", "/cases")).toBe("/login?role=user&next=%2Fcases");
    expect(entryHref("user", "/governance#audit")).toBe("/login?role=admin&next=%2Fgovernance%23audit");
  });
});
