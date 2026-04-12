import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers/theme-provider";
import {
  getResolvedThemeFromCookie,
  getThemePreferenceFromCookie,
} from "@/lib/theme";
import { APP_CONFIG } from "@/lib/app.config";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: APP_CONFIG.name,
    template: `%s | ${APP_CONFIG.name}`,
  },
  description: APP_CONFIG.description,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [resolvedTheme, themePref] = await Promise.all([
    getResolvedThemeFromCookie(),
    getThemePreferenceFromCookie(),
  ]);

  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} ${geistMono.variable} ${resolvedTheme} h-full antialiased`}
      style={{ colorScheme: resolvedTheme }}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <Providers initialTheme={resolvedTheme} initialPref={themePref}>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
