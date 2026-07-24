import { AuthInterceptor } from "@/components/auth-interceptor";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { YearFilterProvider } from "@/contexts/YearFilterContext";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
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
          <LanguageSwitcher />
          {children}
          <Script id="gtranslate-settings" strategy="afterInteractive">
            {`
              window.gtranslateSettings = {
                default_language: "en",
                languages: ["en", "ar"],

                // Floating widget
                float_switcher_open_direction: "bottom",
                switcher_horizontal_position: "right",
                switcher_vertical_position: "bottom"
              };
            `}
          </Script>

          <Script
            src="https://cdn.gtranslate.net/widgets/latest/float.js"
            strategy="afterInteractive"
          />
        </YearFilterProvider>
      </body>
    </html>
  );
}
