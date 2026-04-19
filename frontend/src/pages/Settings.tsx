import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../services/api";
import { useNavigate } from "react-router-dom";

export default function Settings() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [nvidiaToken, setNvidiaToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSaveToken() {
    if (!nvidiaToken.trim()) return;
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      await api.saveNvidiaToken(nvidiaToken);
      setSuccess(true);
      setNvidiaToken("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, #ede9f6 0%, #e8eaf6 50%, #e9f0f8 100%)" }}>

      {/* orbs */}
      <div className="fixed -top-40 -left-24 w-125 h-125 rounded-full opacity-35 pointer-events-none"
        style={{ background: "#c4b5fd", filter: "blur(90px)" }} />
      <div className="fixed top-20 -right-20 w-100 h-100 rounded-full opacity-30 pointer-events-none"
        style={{ background: "#a5c8f0", filter: "blur(90px)" }} />

      {/* navbar */}
      <nav className="sticky top-0 z-10 flex items-center justify-between px-7 py-4 border-b border-white/60"
        style={{ background: "rgba(255,255,255,0.45)", backdropFilter: "blur(20px)" }}>
        <button onClick={() => navigate("/")}
          className="font-serif text-xl text-[#2d2640]">
          aether<em className="text-[#7c5cbf]">AI</em>
        </button>
        <button onClick={logout}
          className="px-3 py-1.5 rounded-lg text-sm text-[#4a4060]"
          style={{ background: "rgba(255,255,255,0.5)", border: "0.5px solid rgba(0,0,0,0.1)" }}>
          sign out
        </button>
      </nav>

      <main className="relative z-10 max-w-xl mx-auto px-6 pt-14 pb-10">
        <h1 className="font-serif text-4xl text-[#1e1830] leading-tight mb-2">
          Settings
        </h1>
        <p className="text-sm text-[#8a7fa0] mb-10">Manage your account</p>

        {/* account info */}
        <div className="rounded-2xl p-5 mb-4"
          style={{ background: "rgba(255,255,255,0.55)", border: "0.5px solid rgba(255,255,255,0.8)", backdropFilter: "blur(24px)" }}>
          <p className="text-[11px] uppercase tracking-wide text-[#8a7fa0] mb-1">Account</p>
          <p className="text-[15px] text-[#1e1830]">{user?.email}</p>
        </div>

        {/* nvidia token */}
        <div className="rounded-2xl p-5"
          style={{ background: "rgba(255,255,255,0.55)", border: "0.5px solid rgba(255,255,255,0.8)", backdropFilter: "blur(24px)" }}>
          <p className="text-[11px] uppercase tracking-wide text-[#8a7fa0] mb-1">NVIDIA API Token</p>
          <p className="text-[13px] text-[#8a7fa0] mb-4">
            {user?.has_token ? "Token configured. Paste a new one to update it." : "No token yet. Add one to start generating."}
          </p>

          <input
            type="password"
            placeholder="nvapi-..."
            value={nvidiaToken}
            onChange={(e) => setNvidiaToken(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSaveToken(); }}
            className="w-full rounded-xl px-3.5 py-2.5 text-sm text-[#1e1830] outline-none mb-1.5 placeholder:text-[#c4b5d8]"
            style={{ background: "rgba(255,255,255,0.6)", border: "0.5px solid rgba(0,0,0,0.1)" }}
          />
          <a href="https://build.nvidia.com" target="_blank"
            className="text-[11px] text-[#7c5cbf] mb-4 block">
            get your token at build.nvidia.com →
          </a>

          {error && <p className="text-[12px] text-red-600 mb-3">{error}</p>}
          {success && <p className="text-[12px] text-[#7c5cbf] mb-3">Token saved successfully.</p>}

          <button onClick={handleSaveToken}
            disabled={loading || !nvidiaToken.trim()}
            className="px-5 py-2 rounded-xl text-sm font-medium text-white bg-[#2d2640] transition-opacity disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-85">
            {loading ? "saving..." : "Save token"}
          </button>
        </div>
      </main>
    </div>
  );
}