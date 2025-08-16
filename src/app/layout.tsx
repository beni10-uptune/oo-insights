import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { FirebaseAuthProvider } from "@/components/providers/firebase-auth-provider";
import { AuthWrapper } from "@/components/auth-wrapper";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "OO Insights - EUCAN Marketing Intelligence",
  description: "Internal marketing insights app for obesity medication campaigns",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen`}>
        <FirebaseAuthProvider>
          <AuthWrapper>
            {children}
          </AuthWrapper>
        </FirebaseAuthProvider>
      </body>
    </html>
  );
}
