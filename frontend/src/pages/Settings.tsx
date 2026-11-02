import { useState } from "react";
import { useAuth } from "../contexts/useAuth";
import { Navbar } from "../components/Navbar";
import { BackgroundOrbs } from "../components/BackgroundOrbs";
import { api } from "../services/api";

export default function Settings() {
  const { user, refreshUser } = useAuth();
  const [nvidiaToken, setNvidiaToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSaveToken() {
    if (!nvidiaToken.trim() || loading) return;
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await api.saveNvidiaToken(nvidiaToken.trim());
      setSuccess(true);
      setNvidiaToken("");
      await refreshUser();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save token");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-ambient min-h-screen relative overflow-hidden">
      <BackgroundOrbs />
      <Navbar />

      <main className="relative z-10 max-w-xl mx-auto px-6 pt-14 pb-10">
        <h1 className="font-serif text-4xl text-[#1e1830] leading-tight mb-2">
          Settings
        </h1>
        <p className="text-sm text-[#8a7fa0] mb-10">Manage your account and credentials</p>

        <div className="glass-card rounded-2xl p-5 mb-4 shadow-sm">
          <p className="text-[11px] uppercase tracking-wide text-[#8a7fa0] mb-1 font-medium">Account</p>
          <p className="text-[15px] text-[#1e1830]">{user?.email}</p>
        </div>

        <div className="glass-card rounded-2xl p-5 shadow-sm">
          <p className="text-[11px] uppercase tracking-wide text-[#8a7fa0] mb-1 font-medium">NVIDIA API Token</p>
          <p className="text-[13px] text-[#8a7fa0] mb-4">
            {user?.has_token
              ? "Token configured. Paste a new token below to replace it."
              : "No token yet. Add one to generate without demo limits."}
          </p>

          <input
            type="password"
            placeholder="nvapi-..."
            value={nvidiaToken}
            onChange={(e) => setNvidiaToken(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSaveToken();
              }
            }}
            className="glass-input w-full rounded-xl px-3.5 py-2.5 text-sm text-[#1e1830] outline-none mb-1.5 placeholder:text-[#c4b5d8]"
          />
          <a
            href="https://build.nvidia.com"
            target="_blank"
            rel="noreferrer"
            className="text-[11px] text-[#7c5cbf] hover:underline mb-4 block"
          >
            Get your token at build.nvidia.com
          </a>

          {error && <p className="text-[12px] text-red-600 mb-3">{error}</p>}
          {success && <p className="text-[12px] text-[#7c5cbf] mb-3">Token saved successfully.</p>}

          <button
            type="button"
            onClick={handleSaveToken}
            disabled={loading || !nvidiaToken.trim()}
            className="px-5 py-2 rounded-xl text-sm font-medium text-white bg-[#2d2640] transition-opacity disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 cursor-pointer"
          >
            {loading ? "Saving..." : "Save token"}
          </button>
        </div>
      </main>
    </div>
  );
}
