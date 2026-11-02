import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/useAuth";

interface PrivateRouteProps {
  children: React.ReactNode;
}

export function PrivateRoute({ children }: PrivateRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="bg-ambient min-h-screen flex items-center justify-center text-sm text-[#8a7fa0]">
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
