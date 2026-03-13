import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import AppShell from "@/components/app-shell";
import { SpotifyProvider } from "@/lib/spotify-context";
import { AuthProvider } from "@/lib/auth-context";
import { SidebarProvider } from "@/lib/sidebar-context";
import { ThemeProvider } from "next-themes";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Priority Compass",
  description: "Stay focused on what matters most.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <AuthProvider>
            <SpotifyProvider>
              <SidebarProvider>
                <AppShell>{children}</AppShell>
                <Toaster position="top-right" richColors closeButton />
              </SidebarProvider>
            </SpotifyProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
