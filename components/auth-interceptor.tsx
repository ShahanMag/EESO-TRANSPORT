"use client";

import { useEffect } from "react";

/**
 * Globally intercepts all fetch() calls and redirects to /login on 401.
 * Mount once in the root layout to cover the entire app.
 */
export function AuthInterceptor() {
  useEffect(() => {
    const originalFetch = window.fetch;

    window.fetch = async function (...args: Parameters<typeof fetch>) {
      const response = await originalFetch.apply(this, args);

      if (
        response.status === 401 &&
        !window.location.pathname.startsWith("/login")
      ) {
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
