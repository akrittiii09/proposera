import { redirect } from "next/navigation";
import { getCurrentCreator } from "@/lib/auth/requireAuth";
import LoginForm from "@/components/auth/LoginForm";

export const metadata = {
  title: "Sign In | Proposera",
  description: "Sign in to Proposera Creator Studio",
};

export default async function LoginPage() {
  const auth = await getCurrentCreator();
  if (auth) {
    redirect("/app/proposals");
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4 sm:p-6 lg:p-8 bg-neutral-50 dark:bg-neutral-950">
      <LoginForm />
    </main>
  );
}
