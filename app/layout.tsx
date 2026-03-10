import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import Nav from "@/components/nav";
import { SpotifyProvider } from "@/lib/spotify-context";
import { AuthProvider } from "@/lib/auth-context";
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
              <div className="flex min-h-screen">
                <Nav />
                <main className="flex-1 md:ml-56 p-4 md:p-8 pt-16 md:pt-8 max-w-4xl">
                  {children}
                </main>
              </div>
              <Toaster position="top-right" richColors closeButton />
            </SpotifyProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
