// API Configuration for connecting frontend to backend
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// Helper function for making API requests
// Authorization header is injected globally by AuthInterceptor
export async function apiRequest(
  endpoint: string,
  options: RequestInit = {}
) {
  const url = `${API_BASE_URL}${endpoint}`;

  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    },
  };

  const response = await fetch(url, { ...defaultOptions, ...options });

  return response;
}
