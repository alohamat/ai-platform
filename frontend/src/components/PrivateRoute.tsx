import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return <div className="flex h-screen items-center justify-center text-zinc-400">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;

  return <>{children}</>;
}