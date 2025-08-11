import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AuthSessionProvider } from "@/components/providers/session-provider";

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
      <body className={`${inter.className} h-screen overflow-hidden`}>
        <AuthSessionProvider>
          <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
              <main className="w-full h-full overflow-auto p-6">
                {children}
              </main>
            </SidebarInset>
          </SidebarProvider>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
