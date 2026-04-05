import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../services/api";

export function AuthModal({ onClose }: { onClose: () => void }) {
  const { login, register } = useAuth();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [nvidiaToken, setNvidiaToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [closing, setClosing] = useState(false);

  function handleClose() {
    setClosing(true);
  }

  useEffect(() => {
    if (closing) {
      const timer = setTimeout(onClose, 100); // wait animation
      return () => clearTimeout(timer);
    }
  }, [closing]);

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
        await api.saveNvidiaToken(nvidiaToken);
      }
    }
    handleClose();
  } catch (err: any) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
}

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-6
        ${closing
          ? "animate-out fade-out duration-150"
          : "animate-in fade-in duration-150"}`}
      style={{ background: "rgba(237,233,246,0.6)", backdropFilter: "blur(16px)" }}
      onClick={handleClose}>
      <div
        className={`w-full max-w-sm rounded-2xl p-7 shadow-xl
          ${closing
            ? "animate-out fade-out zoom-out-95 duration-150"
            : "animate-in fade-in zoom-in-95 duration-200"}`}
        style={{ background: "rgba(255,255,255,0.72)", border: "0.5px solid rgba(255,255,255,0.9)", backdropFilter: "blur(40px)" }}
        onClick={(e) => e.stopPropagation()}>

        {/* tabs */}
        <div className="flex gap-0.5 rounded-xl p-1 mb-6"
          style={{ background: "rgba(0,0,0,0.05)" }}>
          {(["login", "register"] as const).map((t) => (
            <button key={t} onClick={() => { setTab(t); setError(null); }}
              className={`flex-1 py-1.5 rounded-lg text-[13px] font-sans transition-all
        ${tab === t ? "bg-white text-[#2d2640] shadow-sm" : "text-[#8a7fa0]"}`}>
              {t === "login" ? "Sign in" : "Create account"}
            </button>
          ))}
        </div>

        <p className="font-serif text-2xl text-[#1e1830] mb-1">
          {tab === "login" ? "Welcome back" : "Get started"}
        </p>
        <p className="text-[13px] text-[#8a7fa0] mb-6">
          {tab === "login" ? "Sign in to continue generating" : "Start with 3 free generations"}
        </p>

        {tab === "register" && (
          <>
            <label className="block text-[11px] uppercase tracking-wide text-[#8a7fa0] mb-1.5">
              NVIDIA API Token
            </label>
            <input
              type="password"
              placeholder="nvapi-..."
              value={nvidiaToken}
              onChange={(e) => setNvidiaToken(e.target.value)}
              className="w-full rounded-xl px-3.5 py-2.5 text-sm text-[#1e1830] outline-none mb-1.5 placeholder:text-[#c4b5d8]"
              style={{ background: "rgba(255,255,255,0.6)", border: "0.5px solid rgba(0,0,0,0.1)" }}
            />
            <a href="https://build.nvidia.com/explore/discover?integrate_nim=true&hosted_api=true&modal=integrate-nim" target="_blank"
              className="text-[11px] text-[#7c5cbf] mb-4 block">
              get your token at build.nvidia.com →
            </a>
          </>
        )}

        {(["Email", "Password"] as const).map((field) => (
          <div key={field}>
            <label className="block text-[11px] uppercase tracking-wide text-[#8a7fa0] mb-1.5">
              {field}
            </label>
            <input
              type={field === "Password" ? "password" : "email"}
              placeholder={field === "Password" ? "••••••••" : "you@example.com"}
              value={field === "Email" ? email : password}
              onChange={(e) => field === "Email" ? setEmail(e.target.value) : setPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
              className="w-full rounded-xl px-3.5 py-2.5 text-sm text-[#1e1830] outline-none mb-4 transition-colors placeholder:text-[#c4b5d8]"
              style={{ background: "rgba(255,255,255,0.6)", border: "0.5px solid rgba(0,0,0,0.1)" }}
            />
          </div>
        ))}

        {error && <p className="text-[12px] text-red-600 mb-3">{error}</p>}

        <button onClick={handleSubmit} disabled={loading}
          className="w-full py-3 rounded-xl text-sm font-medium text-white bg-[#2d2640] transition-opacity disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-85 hover:cursor-pointer">
          {loading ? "..." : tab === "login" ? "Continue" : "Get started"}
        </button>
      </div>
    </div>
  );
}