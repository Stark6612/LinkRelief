"use client";

import { usePathname } from "next/navigation";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Toaster } from "sonner";
import GlobalAlert from "@/components/GlobalAlert";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  // Define public routes where Sidebar/Header should NOT appear
  const isPublicPage = pathname === '/login' || pathname === '/signup' || pathname === '/';

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} bg-gray-50 dark:bg-dark-900 text-gray-900 dark:text-gray-100`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <GlobalAlert />
          <Toaster position="top-center" expand={true} richColors />
          <div className="flex h-screen overflow-hidden">
            {/* Sidebar only on protected routes */}
            {!isPublicPage && <Sidebar />}

            {/* Main Content */}
            {/* Add margin if sidebar is present to prevent overlap */}
            <main className={`flex-1 flex flex-col overflow-hidden relative transition-all duration-300 ${!isPublicPage ? 'md:ml-64' : ''}`}>

              {/* Header only on protected routes */}
              {!isPublicPage && (
                <header className="h-16 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-6 bg-white dark:bg-dark-900/80 backdrop-blur-sm z-10 sticky top-0">
                  <h1 className="text-lg font-semibold capitalize">
                    {pathname.replace('/', '') || 'Dashboard'}
                  </h1>
                  <div className="flex items-center gap-2">
                    <ThemeToggle />
                  </div>
                </header>
              )}

              {/* Scrollable Page Content */}
              <div className="flex-1 overflow-auto p-4 md:p-6">
                {children}
              </div>
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
