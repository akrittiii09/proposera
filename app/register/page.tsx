import { redirect } from "next/navigation";
import { getCurrentCreator } from "@/lib/auth/requireAuth";
import RegisterForm from "@/components/auth/RegisterForm";

export const metadata = {
  title: "Create Account | Proposera",
  description: "Sign up for Proposera Creator Studio",
};

export default async function RegisterPage() {
  const auth = await getCurrentCreator();
  if (auth) {
    redirect("/app/proposals");
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4 sm:p-6 lg:p-8 bg-neutral-50 dark:bg-neutral-950">
      <RegisterForm />
    </main>
  );
}
