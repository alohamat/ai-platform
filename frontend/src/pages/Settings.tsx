import { useState } from "react";
import { useAuth } from "../contexts/useAuth";
import { Navbar } from "../components/Navbar";
import { BackgroundOrbs } from "../components/BackgroundOrbs";
import { api } from "../services/api";

export default function Settings() {
  const { user, refreshUser } = useAuth();
  const [nvidiaToken, setNvidiaToken] = useState("");
  const [loadingNvidia, setLoadingNvidia] = useState(false);
  const [successNvidia, setSuccessNvidia] = useState(false);
  const [errorNvidia, setErrorNvidia] = useState<string | null>(null);

  const [hfToken, setHfToken] = useState("");
  const [loadingHf, setLoadingHf] = useState(false);
  const [successHf, setSuccessHf] = useState(false);
  const [errorHf, setErrorHf] = useState<string | null>(null);

  async function handleSaveNvidiaToken() {
    if (!nvidiaToken.trim() || loadingNvidia) return;
    setLoadingNvidia(true);
    setErrorNvidia(null);
    setSuccessNvidia(false);

    try {
      await api.saveNvidiaToken(nvidiaToken.trim());
      setSuccessNvidia(true);
      setNvidiaToken("");
      await refreshUser();
    } catch (err: unknown) {
      setErrorNvidia(err instanceof Error ? err.message : "Failed to save NVIDIA token");
    } finally {
      setLoadingNvidia(false);
    }
  }

  async function handleSaveHfToken() {
    if (!hfToken.trim() || loadingHf) return;
    setLoadingHf(true);
    setErrorHf(null);
    setSuccessHf(false);

    try {
      await api.saveHfToken(hfToken.trim());
      setSuccessHf(true);
      setHfToken("");
      await refreshUser();
    } catch (err: unknown) {
      setErrorHf(err instanceof Error ? err.message : "Failed to save Hugging Face token");
    } finally {
      setLoadingHf(false);
    }
  }

  return (
    <div className="bg-ambient min-h-screen relative overflow-hidden text-[#1e1830] dark:text-[#f1eff8]">
      <BackgroundOrbs />
      <Navbar />

      <main className="relative z-10 max-w-xl mx-auto px-6 pt-14 pb-10">
        <h1 className="font-serif text-4xl text-[#1e1830] dark:text-[#f1eff8] leading-tight mb-2">
          Settings
        </h1>
        <p className="text-sm text-[#8a7fa0] dark:text-[#9d95b5] mb-10">Manage your account and API credentials</p>

        <div className="glass-card rounded-2xl p-5 mb-4 shadow-sm">
          <p className="text-[11px] uppercase tracking-wide text-[#8a7fa0] dark:text-[#9d95b5] mb-1 font-medium">Account</p>
          <p className="text-[15px] text-[#1e1830] dark:text-[#f1eff8]">{user?.email}</p>
        </div>

        {/* NVIDIA Token (Generation) */}
        <div className="glass-card rounded-2xl p-5 mb-4 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[11px] uppercase tracking-wide text-[#8a7fa0] dark:text-[#9d95b5] font-medium">
              NVIDIA API Token (Image Generation)
            </p>
            {user?.has_token && (
              <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                Active
              </span>
            )}
          </div>
          <p className="text-[13px] text-[#8a7fa0] dark:text-[#9d95b5] mb-4">
            {user?.has_token
              ? "Token configured for FLUX.2 Klein 4B. Paste a new token below to replace it."
              : "Add your NVIDIA token to generate images without demo limits."}
          </p>

          <input
            type="password"
            placeholder="nvapi-..."
            value={nvidiaToken}
            onChange={(e) => setNvidiaToken(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSaveNvidiaToken();
              }
            }}
            className="glass-input w-full rounded-xl px-3.5 py-2.5 text-sm text-[#1e1830] dark:text-[#f1eff8] outline-none mb-1.5 placeholder:text-[#c4b5d8] dark:placeholder:text-[#6b6385]"
          />
          <a
            href="https://build.nvidia.com"
            target="_blank"
            rel="noreferrer"
            className="text-[11px] text-[#7c5cbf] dark:text-[#9d7cf0] hover:underline mb-4 block"
          >
            Get your token at build.nvidia.com
          </a>

          {errorNvidia && <p className="text-[12px] text-red-600 dark:text-red-400 mb-3">{errorNvidia}</p>}
          {successNvidia && <p className="text-[12px] text-emerald-600 dark:text-emerald-400 mb-3">NVIDIA token saved successfully.</p>}

          <button
            type="button"
            onClick={handleSaveNvidiaToken}
            disabled={loadingNvidia || !nvidiaToken.trim()}
            className="px-5 py-2 rounded-xl text-sm font-medium text-white bg-[#2d2640] dark:bg-[#9d7cf0] dark:text-[#120f1e] dark:hover:bg-[#b096f6] transition-opacity disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 cursor-pointer"
          >
            {loadingNvidia ? "Saving..." : "Save NVIDIA token"}
          </button>
        </div>

        {/* Hugging Face Token (Editing) */}
        <div className="glass-card rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[11px] uppercase tracking-wide text-[#8a7fa0] dark:text-[#9d95b5] font-medium">
              Hugging Face Token (Image Editing)
            </p>
            {user?.has_hf_token && (
              <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                Active
              </span>
            )}
          </div>
          <p className="text-[13px] text-[#8a7fa0] dark:text-[#9d95b5] mb-4">
            {user?.has_hf_token
              ? "Token configured for InstructPix2Pix editing. Paste a new token below to replace it."
              : "Used for InstructPix2Pix image editing. A platform default token is also active."}
          </p>

          <input
            type="password"
            placeholder="hf_..."
            value={hfToken}
            onChange={(e) => setHfToken(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSaveHfToken();
              }
            }}
            className="glass-input w-full rounded-xl px-3.5 py-2.5 text-sm text-[#1e1830] dark:text-[#f1eff8] outline-none mb-1.5 placeholder:text-[#c4b5d8] dark:placeholder:text-[#6b6385]"
          />
          <a
            href="https://huggingface.co/settings/tokens"
            target="_blank"
            rel="noreferrer"
            className="text-[11px] text-[#7c5cbf] dark:text-[#9d7cf0] hover:underline mb-4 block"
          >
            Get your free user token at huggingface.co/settings/tokens
          </a>

          {errorHf && <p className="text-[12px] text-red-600 dark:text-red-400 mb-3">{errorHf}</p>}
          {successHf && <p className="text-[12px] text-emerald-600 dark:text-emerald-400 mb-3">Hugging Face token saved successfully.</p>}

          <button
            type="button"
            onClick={handleSaveHfToken}
            disabled={loadingHf || !hfToken.trim()}
            className="px-5 py-2 rounded-xl text-sm font-medium text-white bg-[#2d2640] dark:bg-[#9d7cf0] dark:text-[#120f1e] dark:hover:bg-[#b096f6] transition-opacity disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 cursor-pointer"
          >
            {loadingHf ? "Saving..." : "Save HF token"}
          </button>
        </div>
      </main>
    </div>
  );
}
