import { AuthInterceptor } from "@/components/auth-interceptor";
// import LanguageSwitcher from "@/components/LanguageSwitcher";
import { YearFilterProvider } from "@/contexts/YearFilterContext";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Al Jawhara",
  description: "Al Jawhara",
  icons: {
    icon: "/images/new-logo1.jpeg",
    apple: "/images/new-logo1.jpeg",
  },
};
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthInterceptor />
        <YearFilterProvider>
          {/* <LanguageSwitcher /> */}
          {children}
        </YearFilterProvider>
      </body>
    </html>
  );
}
