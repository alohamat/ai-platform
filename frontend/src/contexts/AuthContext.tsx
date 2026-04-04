import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../services/api";

interface User {
  email: string;
  free_credits: number;
  has_token: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

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
    if (localStorage.getItem("token")) {
      refreshUser().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
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

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}