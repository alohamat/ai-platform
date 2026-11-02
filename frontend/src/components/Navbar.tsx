import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/useAuth";

interface NavbarProps {
  demoCredits?: number | null;
  onOpenAuth?: () => void;
}

export function Navbar({ demoCredits, onOpenAuth }: NavbarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isSettings = location.pathname === "/settings";

  return (
    <nav className="glass-nav sticky top-0 z-10 flex items-center justify-between px-7 py-4">
      <button
        type="button"
        onClick={() => navigate("/")}
        className="font-serif text-xl text-[#2d2640] cursor-pointer text-left"
      >
        aether<em className="text-[#7c5cbf] not-italic font-serif">AI</em>
      </button>

      <div className="flex items-center gap-3">
        {user ? (
          <>
            {!isSettings && (
              <div className="badge-purple flex items-center gap-2 px-3 py-1.5 rounded-full text-xs">
                <div className="w-1.5 h-1.5 rounded-full bg-[#7c5cbf]" />
                Logged in
              </div>
            )}
            <button
              type="button"
              onClick={logout}
              className="glass-button px-3 py-1.5 rounded-lg text-sm text-[#4a4060] transition-colors hover:bg-white/70 cursor-pointer"
            >
              Sign out
            </button>
            <button
              type="button"
              onClick={() => navigate(isSettings ? "/" : "/settings")}
              className="glass-button px-3 py-1.5 rounded-lg text-sm text-[#4a4060] transition-colors hover:bg-white/70 cursor-pointer"
            >
              {isSettings ? "Dashboard" : "Settings"}
            </button>
          </>
        ) : (
          <>
            {demoCredits !== null && demoCredits !== undefined && (
              <div className="badge-purple flex items-center gap-2 px-3 py-1.5 rounded-full text-xs">
                <div className="w-1.5 h-1.5 rounded-full bg-[#7c5cbf]" />
                {demoCredits} demo credit{demoCredits !== 1 ? "s" : ""} left
              </div>
            )}
            <button
              type="button"
              onClick={onOpenAuth}
              className="glass-button px-3 py-1.5 rounded-lg text-sm text-[#4a4060] transition-colors hover:bg-white/70 cursor-pointer"
            >
              Sign in
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
