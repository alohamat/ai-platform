import { useEffect, useState } from "react";
import { api } from "../services/api";
import { AuthContext, type User } from "./auth-context";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(() => Boolean(localStorage.getItem("token")));

  async function refreshUser() {
    try {
      const data = await api.me();
      setUser(data);
    } catch {
      setUser(null);
      localStorage.removeItem("token");
    }
  }

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    let isMounted = true;
    api.me()
      .then((data) => {
        if (isMounted) setUser(data);
      })
      .catch(() => {
        if (isMounted) {
          setUser(null);
          localStorage.removeItem("token");
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  async function login(email: string, password: string) {
    const { token } = await api.login(email, password);
    localStorage.setItem("token", token);
    await refreshUser();
  }

  async function register(email: string, password: string) {
    const { token } = await api.register(email, password);
    localStorage.setItem("token", token);
    await refreshUser();
  }

  function logout() {
    localStorage.removeItem("token");
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}
