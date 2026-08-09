import type { Metadata, Viewport } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { ReactQueryProvider } from "@/components/react-query-provider";
import { PwaRegister } from "@/components/pwa/pwa-register";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Senlie Budget — Your money, clearly.",
  description:
    "Senlie Budget by Senlie Technologies. A calm, premium personal-finance operating system. Know exactly how much you have, where it's going, and how much you can safely spend.",
  keywords: [
    "Senlie Budget",
    "Senlie Technologies",
    "personal finance",
    "budgeting",
    "expense tracker",
  ],
  authors: [{ name: "Senlie Technologies" }],
  manifest: "/manifest.webmanifest",
  applicationName: "Senlie Budget",
  appleWebApp: {
    capable: true,
    title: "Senlie Budget",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", type: "image/x-icon" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
    shortcut: "/icon-192.png",
  },
  openGraph: {
    title: "Senlie Budget",
    description: "Your money, clearly.",
    siteName: "Senlie Budget",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F5F5F7" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ReactQueryProvider>
            <PwaRegister />
            {children}
            <Toaster />
            <Sonner />
          </ReactQueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
