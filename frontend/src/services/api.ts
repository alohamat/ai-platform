const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

function getToken(): string | null {
  return localStorage.getItem("token");
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
    request<{ email: string; has_token: boolean; has_hf_token?: boolean }>("/auth/me"),

  saveNvidiaToken: (token: string) =>
    request<{ message: string }>("/auth/token", {
      method: "POST",
      body: JSON.stringify({ token }),
    }),

  saveHfToken: (token: string) =>
    request<{ message: string }>("/auth/hf-token", {
      method: "POST",
      body: JSON.stringify({ token }),
    }),

  generateImage: (prompt: string, width = 1024, height = 1024, steps = 4) =>
    request<{ image_base64: string; seed: number }>("/ai/image", {
      method: "POST",
      body: JSON.stringify({ prompt, width, height, steps }),
    }),

  editImage: (prompt: string, image: string, width = 1024, height = 1024, steps = 20) =>
    request<{ image_base64: string; seed: number }>("/ai/image", {
      method: "POST",
      body: JSON.stringify({
        prompt,
        image,
        width,
        height,
        steps,
      }),
    }),

  getDemoCredits: () =>
    request<{ remaining: number; editRemaining: number }>("/ai/demo/credits"),

  generateImageDemo: (prompt: string, width = 1024, height = 1024) =>
    request<{ image_base64: string; seed: number }>("/ai/image/demo", {
      method: "POST",
      body: JSON.stringify({
        prompt,
        width,
        height,
        steps: 4,
        seed: 0,
      }),
    }),

  editImageDemo: (prompt: string, image: string, steps = 20) =>
    request<{ image_base64: string; seed: number }>("/ai/image/demo", {
      method: "POST",
      body: JSON.stringify({
        prompt,
        image,
        steps,
        seed: 0,
      }),
    }),
};
