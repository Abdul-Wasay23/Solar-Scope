"use client";

import { Suspense } from "react";
import LoginForm from "./LoginForm";

/**
 * Login page — wraps LoginForm in Suspense so useSearchParams()
 * (used for ?next= redirect) doesn't block the static shell.
 * Next.js 14 App Router requires this pattern for useSearchParams.
 */
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
