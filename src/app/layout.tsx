import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "@/contexts/AuthContext";
import Header from "@/components/ui/Header";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Marketplace Clone By Mark Daniel",
  description: "A Facebook Marketplace clone built with Next.js and Supabase",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <AuthProvider>
          {/* Fixed Header */}
          <div className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm">
            <Header />
          </div>

          {/* Main Content with padding-top to account for fixed header */}
          <main className="min-h-screen bg-gray-50 pt-16">{children}</main>

          <footer className="bg-white border-t mt-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="text-center text-gray-600">
                <p>
                  &copy; 2025 Mark Daniel Edillor. Built with Next.js &
                  Supabase.
                </p>
              </div>
            </div>
          </footer>

          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
