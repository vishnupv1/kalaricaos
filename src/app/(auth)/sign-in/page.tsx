import Link from "next/link";
import { redirect } from "next/navigation";

import { KalaricaLogo } from "@/components/brand/kalarica-logo";
import { SignInForm } from "@/modules/auth/components/sign-in-form";
import { getServerSession } from "@/server/auth/session";

export default async function SignInPage() {
  const session = await getServerSession();
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="px-6 py-5 md:px-10">
        <Link href="/" className="inline-block outline-none ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background">
          <KalaricaLogo variant="header" />
        </Link>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        <SignInForm />
      </main>
    </div>
  );
}
