const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

function getToken() {
  return localStorage.getItem("token");
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message = body.detail ?? body.error ?? res.statusText;
    throw new Error(message);
  }

  return res.json();
}

export const api = {
  register: (email: string, password: string) =>
    request<{ token: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  login: (email: string, password: string) =>
    request<{ token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  me: () =>
    request<{ email: string; free_credits: number; has_token: boolean }>("/auth/me"),

  saveNvidiaToken: (token: string) =>
    request("/auth/token", {
      method: "POST",
      body: JSON.stringify({ token }),
    }),

  generateImage: (prompt: string, width?: number, height?: number) =>
    request<{ image_base64: string; seed: number }>("/ai/image", {
      method: "POST",
      body: JSON.stringify({ prompt, width: width ?? 1024, height: height ?? 1024 }),
    }),

  getDemoCredits: () =>
    request<{ remaining: number }>("/ai/demo/credits"),

  generateImageDemo: (prompt: string, width?: number, height?: number) =>
    request<{ image_base64: string; seed: number }>("/ai/image/demo", {
      method: "POST",
      body: JSON.stringify({
        prompt,
        width: width ?? 1024,
        height: height ?? 1024,
        steps: 4,
        seed: 0,
      }),
    }),
};