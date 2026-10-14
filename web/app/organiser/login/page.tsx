import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Organiser sign-in · AI at Work Diagnostic" };

export default function LoginPage() {
  return (
    <main id="view">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
