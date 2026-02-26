"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Shield, Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
import { setToken } from "@/lib/auth-token";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function LoginPage() {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);

  function validateForm() {
    const newErrors: Record<string, string> = {};

    if (!formData.username.trim()) {
      newErrors.username = "Username is required";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setErrors({});

    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (data.success) {
        if (data.data?.token) setToken(data.data.token);
        toast.success("Login successful! Redirecting...");
        // Full page reload so all context providers remount with valid auth
        window.location.href = "/";
      } else {
        toast.error(data.error || "Login failed");
        setErrors({ submit: data.error || "Login failed" });
      }
    } catch (error) {
      console.error("Login error:", error);
      toast.error("An error occurred during login");
      setErrors({ submit: "An error occurred during login" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="space-y-1 text-center pb-8">
          <div className="flex justify-center mb-4">
            <Image
              src="/images/Logo2.jpg"
              alt="EESA Transport Co Logo"
              width={200}
              height={100}
              className="rounded"
            />
          </div>
          <CardTitle className="text-3xl font-bold">Welcome Back</CardTitle>
          <CardDescription className="text-base">
            Sign in to access EESA Transport Management System
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="username" className="text-base">
                Username
              </Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
                disabled={loading}
                className="mt-1.5 h-11"
                autoFocus
              />
              {errors.username && (
                <p className="text-sm text-red-500 mt-1.5">{errors.username}</p>
              )}
            </div>

            <div>
              <Label htmlFor="password" className="text-base">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  disabled={loading}
                  className="mt-1.5 h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 mt-0.75 text-gray-500 hover:text-gray-700 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-red-500 mt-1.5">{errors.password}</p>
              )}
            </div>

            {errors.submit && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                {errors.submit}
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-11 text-base"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <Shield className="mr-2 h-5 w-5" />
                  Sign In
                </>
              )}
            </Button>
          </form>

          {/* <div className="mt-6 text-center text-sm text-gray-500">
            <p>Default Credentials:</p>
            <p className="font-mono text-xs mt-1">
              Admin: admin / 12345678
            </p>
            <p className="font-mono text-xs">
              Super Admin: superadmin / 12345678
            </p>
          </div> */}
        </CardContent>
      </Card>
    </div>
  );
}
