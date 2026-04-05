import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "ADMIN" | "HR" | "INTERVIEWER" | "CANDIDATE";
      firstName: string;
      lastName: string;
      company?: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "ADMIN" | "HR" | "INTERVIEWER" | "CANDIDATE";
    firstName: string;
    lastName: string;
    company?: string;
  }
}