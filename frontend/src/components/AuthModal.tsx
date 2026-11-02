import { useState, useEffect } from "react";
import { useAuth } from "../contexts/useAuth";
import { api } from "../services/api";

interface AuthModalProps {
  onClose: () => void;
}

export function AuthModal({ onClose }: AuthModalProps) {
  const { login, register } = useAuth();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nvidiaToken, setNvidiaToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [closing, setClosing] = useState(false);

  function handleClose() {
    setClosing(true);
  }

  useEffect(() => {
    if (closing) {
      const timer = setTimeout(onClose, 100);
      return () => clearTimeout(timer);
    }
  }, [closing, onClose]);

  async function handleSubmit() {
    if (!email || !password) return;
    setLoading(true);
    setError(null);
    try {
      if (tab === "login") {
        await login(email, password);
      } else {
        await register(email, password);
        if (nvidiaToken.trim()) {
          await api.saveNvidiaToken(nvidiaToken.trim());
        }
      }
      handleClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-md bg-[#ede9f6]/60
        ${closing ? "animate-out fade-out duration-150" : "animate-in fade-in duration-150"}`}
      onClick={handleClose}
    >
      <div
        className={`glass-modal w-full max-w-sm rounded-2xl p-7 shadow-xl
          ${closing
            ? "animate-out fade-out zoom-out-95 duration-150"
            : "animate-in fade-in zoom-in-95 duration-200"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex gap-0.5 rounded-xl p-1 mb-6 bg-black/5">
          <button
            type="button"
            onClick={() => { setTab("login"); setError(null); }}
            className={`flex-1 py-1.5 rounded-lg text-[13px] font-sans transition-all cursor-pointer ${
              tab === "login" ? "bg-white text-[#2d2640] shadow-sm font-medium" : "text-[#8a7fa0]"
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => { setTab("register"); setError(null); }}
            className={`flex-1 py-1.5 rounded-lg text-[13px] font-sans transition-all cursor-pointer ${
              tab === "register" ? "bg-white text-[#2d2640] shadow-sm font-medium" : "text-[#8a7fa0]"
            }`}
          >
            Create account
          </button>
        </div>

        <h2 className="font-serif text-2xl text-[#1e1830] mb-1">
          {tab === "login" ? "Welcome back" : "Get started"}
        </h2>
        <p className="text-[13px] text-[#8a7fa0] mb-6">
          {tab === "login" ? "Sign in to continue generating" : "Start with 3 free generations"}
        </p>

        {tab === "register" && (
          <div className="mb-4">
            <label className="block text-[11px] uppercase tracking-wide text-[#8a7fa0] mb-1.5 font-medium">
              NVIDIA API Token (optional)
            </label>
            <input
              type="password"
              placeholder="nvapi-..."
              value={nvidiaToken}
              onChange={(e) => setNvidiaToken(e.target.value)}
              className="glass-input w-full rounded-xl px-3.5 py-2.5 text-sm text-[#1e1830] outline-none placeholder:text-[#c4b5d8]"
            />
            <a
              href="https://build.nvidia.com"
              target="_blank"
              rel="noreferrer"
              className="text-[11px] text-[#7c5cbf] hover:underline mt-1.5 inline-block"
            >
              Get your token at build.nvidia.com
            </a>
          </div>
        )}

        <div className="mb-4">
          <label className="block text-[11px] uppercase tracking-wide text-[#8a7fa0] mb-1.5 font-medium">
            Email
          </label>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
            className="glass-input w-full rounded-xl px-3.5 py-2.5 text-sm text-[#1e1830] outline-none placeholder:text-[#c4b5d8]"
          />
        </div>

        <div className="mb-4">
          <label className="block text-[11px] uppercase tracking-wide text-[#8a7fa0] mb-1.5 font-medium">
            Password
          </label>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
            className="glass-input w-full rounded-xl px-3.5 py-2.5 text-sm text-[#1e1830] outline-none placeholder:text-[#c4b5d8]"
          />
        </div>

        {error && (
          <p className="text-[12px] text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-3">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="w-full py-3 rounded-xl text-sm font-medium text-white bg-[#2d2640] transition-opacity disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 cursor-pointer"
        >
          {loading ? "Please wait..." : tab === "login" ? "Continue" : "Get started"}
        </button>
      </div>
    </div>
  );
}
