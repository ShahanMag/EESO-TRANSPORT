import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { YearFilterProvider } from "@/contexts/YearFilterContext";
import { VehicleProvider } from "@/contexts/VehicleContext";
import { EmployeeProvider } from "@/contexts/EmployeeContext";
import { PaymentProvider } from "@/contexts/PaymentContext";
import { AuthInterceptor } from "@/components/auth-interceptor";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "EESA Transport Co",
  description: "EESA Transport Co",
  icons: {
    icon: "/images/Logo.jpeg",
    apple: "/images/Logo.jpeg",
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
          <VehicleProvider>
            <EmployeeProvider>
              <PaymentProvider>
                {children}
              </PaymentProvider>
            </EmployeeProvider>
          </VehicleProvider>
        </YearFilterProvider>
      </body>
    </html>
  );
}
