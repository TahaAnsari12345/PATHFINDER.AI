import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import ClientLayout from "@/components/ClientLayout";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "LearnMate AI",
  description: "AI-powered learning companion",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script src="https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js"></script>
      </head>
      <body
        className={`${outfit.variable} antialiased bg-[#0B1120] text-slate-200 font-sans selection:bg-cyan-500/30 selection:text-cyan-100`}
      >
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
}
