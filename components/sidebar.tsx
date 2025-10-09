"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  Users,
  Car,
  FileText,
  BarChart3,
  Home,
  Phone,
  Mail,
} from "lucide-react";
import { cn } from "@/lib/utils";

const topNavigation = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Employees", href: "/employees", icon: Users },
  { name: "Vehicles", href: "/vehicles", icon: Car },
  { name: "Reports", href: "/reports", icon: BarChart3 },
];


const incomeExpenseNavigation = [
  { name: "Income & Expense", href: "/bills", icon: FileText },
  { name: "Reports", href: "/income-expense-reports", icon: BarChart3 },
];

interface SidebarProps {
  onLinkClick?: () => void;
}

export function Sidebar({ onLinkClick }: SidebarProps = {}) {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-full flex-col bg-gray-900 text-white">
      {/* Logo Only Section */}
      <div className="flex h-20 items-center justify-center px-6 border-b border-gray-800">
        <Image
          src="/images/Logo.jpeg"
          alt="EESA Transport Co Logo"
          width={110}
          height={60}
          className="rounded-lg"
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {/* Top Navigation */}
        {topNavigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onLinkClick}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-gray-800 text-white"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
        {/* Divider */}
        <div className="h-px bg-gray-800 my-4" />

        {/* Financial Section */}
        <div className="pb-2 pt-10">
          <h3 className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Financial
          </h3>
          {incomeExpenseNavigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onLinkClick}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-gray-800 text-white"
                    : "text-gray-300 hover:bg-gray-800 hover:text-white"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Support Section */}
      <div className="border-t border-gray-800 p-4 space-y-3">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Support
        </h3>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-gray-300">
            <Phone className="h-3 w-3" />
            <div className="flex flex-col">
              <span>UAE: +971 508474887</span>
              <span>IND: +971 507436568</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-300">
            <Mail className="h-3 w-3" />
            <span>aslamcp92@gmail.com</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-300">
            <Mail className="h-3 w-3" />
            <span>officialmohammed@gmail.com</span>
          </div>
        </div>
        <p className="text-xs text-gray-500 pt-2 border-t border-gray-800">
          © 2025 EESA Transport Co
        </p>
      </div>
    </div>
  );
}
