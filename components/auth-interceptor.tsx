"use client";

import { useEffect } from "react";
import { getToken, removeToken } from "@/lib/auth-token";

/**
 * Globally intercepts all fetch() calls to:
 * 1. Attach Authorization: Bearer <token> from localStorage
 * 2. Redirect to /login on 401
 * Mount once in the root layout to cover the entire app.
 */
export function AuthInterceptor() {
  useEffect(() => {
    const originalFetch = window.fetch;

    window.fetch = async function (...args: Parameters<typeof fetch>) {
      const [input, init = {}] = args;

      const token = getToken();
      if (token) {
        const headers = new Headers((init as RequestInit).headers);
        if (!headers.has("Authorization")) {
          headers.set("Authorization", `Bearer ${token}`);
        }
        args = [input, { ...(init as RequestInit), headers }];
      }

      const response = await originalFetch.apply(this, args);

      if (
        response.status === 401 &&
        !window.location.pathname.startsWith("/login")
      ) {
        removeToken();
        window.location.href = "/login";
      }

      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  return null;
}
