import { describe, it, expect } from "vitest";
import {
  RegisterSchema,
  LoginSchema,
  CreateProposalSchema,
  UpdateProposalSchema,
  SubmitResponseSchema,
  SlugSchema,
} from "@/lib/validation/schemas";

describe("Validation Schemas", () => {
  describe("RegisterSchema", () => {
    it("accepts valid registration input and normalizes email", () => {
      const result = RegisterSchema.safeParse({
        email: "  NewCreator@Example.Com  ",
        password: "ValidPassword123!",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe("newcreator@example.com");
      }
    });

    it("rejects invalid email addresses", () => {
      const result = RegisterSchema.safeParse({
        email: "not-an-email",
        password: "ValidPassword123!",
      });
      expect(result.success).toBe(false);
    });

    it("rejects passwords under 8 characters", () => {
      const result = RegisterSchema.safeParse({
        email: "valid@example.com",
        password: "short",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("LoginSchema", () => {
    it("accepts valid login input", () => {
      const result = LoginSchema.safeParse({
        email: "user@example.com",
        password: "anypassword",
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty email or password", () => {
      expect(LoginSchema.safeParse({ email: "", password: "pwd" }).success).toBe(false);
      expect(LoginSchema.safeParse({ email: "user@example.com", password: "" }).success).toBe(false);
    });
  });

  describe("CreateProposalSchema", () => {
    it("accepts valid proposal initialization", () => {
      const result = CreateProposalSchema.safeParse({
        title: "Sunset Proposal",
        partnerName: "Sophia",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.themeId).toBe("midnight-velvet"); // default
      }
    });

    it("rejects missing title or partner name", () => {
      expect(CreateProposalSchema.safeParse({ title: "", partnerName: "Sophia" }).success).toBe(false);
      expect(CreateProposalSchema.safeParse({ title: "Title", partnerName: "" }).success).toBe(false);
    });
  });

  describe("SlugSchema", () => {
    it("accepts valid lowercase alphanumeric and hyphenated slugs", () => {
      expect(SlugSchema.safeParse("sophia-love-123").success).toBe(true);
      expect(SlugSchema.safeParse("for-alexander").success).toBe(true);
    });

    it("rejects invalid slugs (too short, uppercase, spaces, special chars)", () => {
      expect(SlugSchema.safeParse("short").success).toBe(false); // < 6 chars
      expect(SlugSchema.safeParse("Sophia-Love").success).toBe(false); // uppercase
      expect(SlugSchema.safeParse("sophia love").success).toBe(false); // spaces
      expect(SlugSchema.safeParse("sophia_love").success).toBe(false); // underscore
      expect(SlugSchema.safeParse("a".repeat(50)).success).toBe(false); // > 48 chars
    });
  });

  describe("UpdateProposalSchema", () => {
    it("accepts partial updates to proposal", () => {
      const result = UpdateProposalSchema.safeParse({
        title: "New Title",
        storyContent: {
          milestones: [{ date: "2024-05-10", text: "When we first spoke" }],
        },
      });
      expect(result.success).toBe(true);
    });
  });

  describe("SubmitResponseSchema", () => {
    it("accepts valid response with choice and optional note", () => {
      const result = SubmitResponseSchema.safeParse({
        choice: "AFFIRMATIVE",
        customNote: "Yes, a thousand times yes!",
      });
      expect(result.success).toBe(true);
    });

    it("accepts response without note", () => {
      const result = SubmitResponseSchema.safeParse({
        choice: "YES",
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty choice", () => {
      expect(SubmitResponseSchema.safeParse({ choice: "" }).success).toBe(false);
    });

    it("rejects notes exceeding 1000 characters", () => {
      expect(
        SubmitResponseSchema.safeParse({
          choice: "YES",
          customNote: "a".repeat(1001),
        }).success
      ).toBe(false);
    });
  });
});
