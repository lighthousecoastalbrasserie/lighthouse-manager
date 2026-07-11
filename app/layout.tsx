import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/context";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Lighthouse Manager",
  description: "Operations Management Platform — Lighthouse Coastal Brasserie",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: "#ffffff",
                color: "#1A1A2E",
                border: "1px solid #4DC8C8",
                borderRadius: "12px",
                fontSize: "14px",
                fontWeight: "500",
              },
              success: {
                iconTheme: {
                  primary: "#4DC8C8",
                  secondary: "#ffffff",
                },
              },
              error: {
                iconTheme: {
                  primary: "#E8637A",
                  secondary: "#ffffff",
                },
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
