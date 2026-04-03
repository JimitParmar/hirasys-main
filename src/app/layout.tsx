import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Hirasys — Hiring, Intelligently Assisted",
  description: "Build visual hiring pipelines with AI-powered screening, assessments, and interviews.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#1E293B",
              color: "#F8FAFC",
              fontSize: "14px",
            },
          }}
        />
      </body>
    </html>
  );
}