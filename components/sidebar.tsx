"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useYearFilter } from "@/contexts/YearFilterContext";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  Calendar,
  Car,
  CreditCard,
  FileText,
  Home,
  LogOut,
  Mail,
  Phone,
  Settings,
  UserCircle,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const topNavigation = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Employees", href: "/employees", icon: Users },
  { name: "Vehicles", href: "/vehicles", icon: Car },
  { name: "Payments", href: "/payments", icon: CreditCard },
  { name: "Reports", href: "/reports", icon: BarChart3 },
  { name: "Settings", href: "/settings", icon: Settings },
];

const incomeExpenseNavigation = [
  { name: "Income & Expense", href: "/bills", icon: FileText },
  { name: "Reports", href: "/income-expense-reports", icon: BarChart3 },
];

interface SidebarProps {
  onLinkClick?: () => void;
}

interface User {
  username: string;
  role: string;
}

export function Sidebar({ onLinkClick }: SidebarProps = {}) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const { selectedYear, setSelectedYear } = useYearFilter();

  // Generate year options (current year ± 5 years)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

  useEffect(() => {
    fetchUser();
  }, []);

  async function fetchUser() {
    try {
      const res = await fetch(`${API_URL}/api/auth/me`, {});
      const data = await res.json();
      if (data.success) {
        setUser(data.data);
      }
    } catch (error) {
      console.error("Error fetching user:", error);
    }
  }

  async function handleLogout() {
    try {
      setLoggingOut(true);
      const res = await fetch(`${API_URL}/api/auth/logout`, {
        method: "POST",
      });
      const data = await res.json();

      if (data.success) {
        toast.success("Logged out successfully");
        router.push("/login");
        router.refresh();
      } else {
        toast.success("Logged out successfully");

        router.push("/login");
        router.refresh();
      }
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("An error occurred during logout");
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto bg-gray-900 text-white hide-scrollbar">
      {/* Logo Section */}
      <div className="border-b border-gray-800 px-4 py-4">
        <div className="relative h-24 w-full">
          <Image
            src="/images/new-logo3.PNG"
            alt="Al Jawhara Logo"
            fill
            priority
            className="object-contain"
            sizes="200px"
          />
        </div>
      </div>
      {/* Year Filter Section */}
      <div className="px-3 py-4 border-b border-gray-800">
        <div className="flex items-center gap-2 mb-2">
          <Calendar className="h-4 w-4 text-gray-400" />
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Year Filter
          </span>
        </div>
        <Select
          value={selectedYear.toString()}
          onValueChange={(value) => setSelectedYear(parseInt(value, 10))}
        >
          <SelectTrigger className="w-full bg-gray-800 border-gray-700 text-white hover:bg-gray-700">
            <SelectValue placeholder="Select year" />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-700">
            {yearOptions.map((year) => (
              <SelectItem
                key={year}
                value={year.toString()}
                className="text-white hover:bg-gray-700 focus:bg-gray-700 focus:text-white"
              >
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
                  : "text-gray-300 hover:bg-gray-800 hover:text-white",
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
                    : "text-gray-300 hover:bg-gray-800 hover:text-white",
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* User Section */}

      <div className="border-t border-gray-800 p-4 shrink-0">
        <div className="bg-gray-800 rounded-lg p-3 mb-3">
          <div className="flex items-center space-x-3 mb-3">
            <UserCircle className="h-8 w-8 text-blue-400" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {user?.username}
              </p>
              <p className="text-xs text-gray-400">
                {user?.role === "super_admin" ? "Super Admin" : "Admin"}
              </p>
            </div>
          </div>
          <Button
            onClick={handleLogout}
            disabled={loggingOut}
            variant="outline"
            className="w-full bg-gray-700 hover:bg-gray-600 border-gray-600 text-white"
            size="sm"
          >
            <LogOut className="h-4 w-4 mr-2" />
            {loggingOut ? "Logging out..." : "Logout"}
          </Button>
        </div>
      </div>

      {/* Support Section */}
      <div className="border-t border-gray-800 p-4 space-y-3 shrink-0">
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
          © 2025 Al Jawhara
        </p>
      </div>
    </div>
  );
}
