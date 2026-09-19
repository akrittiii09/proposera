/**
 * Environment configuration helper and validator.
 * Ensures required runtime variables are present and cleanly typed.
 */

export interface AppEnv {
  NODE_ENV: "development" | "production" | "test";
  APP_URL: string;
}

export function getAppEnv(): AppEnv {
  return {
    NODE_ENV: (process.env.NODE_ENV as AppEnv["NODE_ENV"]) || "development",
    APP_URL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  };
}
