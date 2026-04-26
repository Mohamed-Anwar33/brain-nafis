import { describe, expect, it } from "vitest";

import {
  buildPasswordSignInPayload,
  getPasswordSignInErrorMessage,
  isEmailIdentifier,
  isPhoneIdentifier,
  normalizeDigits,
  normalizePhoneForSupabase,
} from "./passwordSignIn";

describe("passwordSignIn helpers", () => {
  it("normalizes Arabic digits before detection", () => {
    expect(normalizeDigits("٠١٢٢٦٠٣٥٧٤٢")).toBe("01226035742");
  });

  it("detects email identifiers", () => {
    expect(isEmailIdentifier("Admin@Example.com")).toBe(true);
    expect(isEmailIdentifier("01226035742")).toBe(false);
  });

  it("detects and normalizes Egyptian phone numbers", () => {
    expect(isPhoneIdentifier("٠١٢٢٦٠٣٥٧٤٢")).toBe(true);
    expect(normalizePhoneForSupabase("٠١٢٢٦٠٣٥٧٤٢")).toBe("+201226035742");
  });

  it("builds an email payload when the identifier is an email", () => {
    expect(buildPasswordSignInPayload("Admin@Example.com ", "secret")).toEqual({
      email: "admin@example.com",
      password: "secret",
    });
  });

  it("builds a phone payload when the identifier is a mobile number", () => {
    expect(buildPasswordSignInPayload("٠١٢٢٦٠٣٥٧٤٢", "secret")).toEqual({
      phone: "+201226035742",
      password: "secret",
    });
  });

  it("returns a clear message when phone sign-in is disabled", () => {
    expect(
      getPasswordSignInErrorMessage(
        {
          code: "phone_provider_disabled",
          message: "Phone logins are disabled",
        },
        {
          phone: "+201226035742",
          password: "secret",
        },
      ),
    ).toContain("Phone provider");
  });
});
