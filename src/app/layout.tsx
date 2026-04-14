import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { AppHeader } from "@/components/shared/AppHeader";
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from '@vercel/speed-insights/next';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Hirasys — Hiring, Intelligently Assisted",
  description: "Build visual hiring pipelines with AI-powered screening, assessments, and interviews.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <Analytics />
      <body className={inter.className}>
        <AuthProvider>
          <AppHeader />
          <main>{children}</main>
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: "#1E293B",
                color: "#F8FAFC",
                fontSize: "14px",
                borderRadius: "12px",
              },
              success: {
                iconTheme: { primary: "#10B981", secondary: "#fff" },
              },
              error: {
                iconTheme: { primary: "#EF4444", secondary: "#fff" },
              },
            }}
          />
        </AuthProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}