"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

export function useAuth() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const user = session?.user as any;
  const isLoading = status === "loading";
  const isAuthenticated = status === "authenticated";
  const isHR = user?.role === "HR" || user?.role === "ADMIN";
  const isCandidate = user?.role === "CANDIDATE";

  const login = async (email: string, password: string) => {
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    if (result?.error) throw new Error("Invalid credentials");
    return result;
  };

    const register = async (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: string;
    company?: string;
  }) => {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const json = await res.json();

    if (!res.ok) {
      const error: any = new Error(json.error);
      if (json.suggestion) error.suggestion = json.suggestion;
      throw error;
    }

    await login(data.email, data.password);
    return json;
  };
  const logout = async () => {
    await signOut({ redirect: false });
    router.push("/login");
  };

  return { user, session, isLoading, isAuthenticated, isHR, isCandidate, login, register, logout };
}