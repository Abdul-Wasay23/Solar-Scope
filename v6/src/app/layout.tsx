import type { Metadata } from "next";
import { AuthProvider } from "@/providers/AuthContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "SolarScope — Solar Planning & Marketplace Workspace",
  description: "End-to-end solar energy estimation, rooftop engineering, and marketplace platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Google Fonts Inter font link as defined in typography.txt */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
