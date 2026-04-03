import type { NextAuthConfig } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { db } from "./db"

export const authOptions: NextAuthConfig = {
  providers: [
    CredentialsProvider({
  name: "credentials",
  credentials: {
    email: {},
    password: {},
  },
  async authorize(credentials) {
    const email = credentials?.email as string
    const password = credentials?.password as string

    if (!email || !password) return null

    const user = await db.user.findUnique({
      where: { email },
    })

    if (!user || !user.isActive) return null

    const isValid = await bcrypt.compare(password, user.passwordHash)

    if (!isValid) return null

    await db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })

    return {
      id: String(user.id),
      email: user.email,
      name: `${user.firstName} ${user.lastName}`,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
    }
  },
}),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role
        token.firstName = (user as any).firstName
        token.lastName = (user as any).lastName
      }
      return token
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        ;(session.user as any).role = token.role
        ;(session.user as any).firstName = token.firstName
        ;(session.user as any).lastName = token.lastName
      }
      return session
    },
  },

  pages: {
    signIn: "/login",
  },

  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60,
  },

  secret: process.env.NEXTAUTH_SECRET,
}