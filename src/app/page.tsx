import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await getSession();

  if (session?.user) {
    const role = (session.user as any).role;
    if (role === "HR" || role === "ADMIN") {
      redirect("/hr/dashboard");
    }
    redirect("/jobs");
  }

  redirect("/login");
}


