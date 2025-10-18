"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { useEffect, useState } from "react";
import {
  Users,
  Car,
  FileText,
  BarChart3,
  Home,
  Phone,
  Mail,
  CreditCard,
  Settings,
  LogOut,
  UserCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

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

  useEffect(() => {
    fetchUser();
  }, []);

  async function fetchUser() {
    try {
      const res = await fetch(`${API_URL}/api/auth/me`, {
        credentials: "include",
      });
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
        credentials: "include",
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
    <div className="flex h-full w-full flex-col bg-gray-900 text-white">
      {/* Logo Only Section */}
      <div className="flex h-20 items-center justify-center px-1 border-b border-gray-800">
        <Image
          src="/images/Logo2.jpg"
          alt="EESA Transport Co Logo"
          width={280}
          height={60}
          className="rounded"
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

      {/* User Section */}

      <div className="border-t border-gray-800 p-4">
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
