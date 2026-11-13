import { chromium } from "playwright";

export function launchBrowser(args = []) {
  if (process.env.PWDEBUG && process.env.PWDEBUG !== "0") {
    throw new Error("Unset PWDEBUG before running background QA.");
  }
  // No browser channel or executable override. Playwright uses its headless shell.
  return chromium.launch({ headless: true, args });
}
