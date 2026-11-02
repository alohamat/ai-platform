import { useEffect, useState } from "react";
import { useAuth } from "../contexts/useAuth";
import { AuthModal } from "../components/AuthModal";
import { Navbar } from "../components/Navbar";
import { BackgroundOrbs } from "../components/BackgroundOrbs";
import { api } from "../services/api";

type Size = "1:1" | "16:9" | "9:16";

const sizeMap: Record<Size, { width: number; height: number }> = {
  "1:1": { width: 1024, height: 1024 },
  "16:9": { width: 1024, height: 576 },
  "9:16": { width: 576, height: 1024 },
};

const aspectRatios: Size[] = ["1:1", "16:9", "9:16"];

export default function Dashboard() {
  const { user } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [size, setSize] = useState<Size>("1:1");
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [demoCredits, setDemoCredits] = useState<number | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      api.getDemoCredits()
        .then((data) => setDemoCredits(data.remaining))
        .catch(() => setDemoCredits(null));
    }
  }, [loading, user]);

  async function handleGenerate() {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setError(null);

    try {
      const { width, height } = sizeMap[size];
      const data = user
        ? await api.generateImage(prompt.trim(), width, height)
        : await api.generateImageDemo(prompt.trim(), width, height);

      setImage(data.image_base64);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to generate image";

      if (message.includes("demo limit reached")) {
        setShowModal(true);
      } else if (message.includes("no credits") || message.includes("no token")) {
        setError("Add your NVIDIA token in settings to keep generating.");
      } else if (message.includes("content filter") || message.includes("Prompt blocked")) {
        setError("Your prompt was blocked by the content filter. Try rephrasing it.");
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-ambient min-h-screen relative overflow-hidden text-[#1e1830] dark:text-[#f1eff8]">
      <BackgroundOrbs />
      <Navbar demoCredits={demoCredits} onOpenAuth={() => setShowModal(true)} />

      <main className="relative z-10 max-w-xl mx-auto px-6 pt-14 pb-10">
        <h1 className="font-serif text-4xl text-[#1e1830] dark:text-[#f1eff8] leading-tight mb-2">
          Generate<br /><em className="text-[#7c5cbf] dark:text-[#9d7cf0] not-italic font-serif">anything.</em>
        </h1>
        <p className="text-sm text-[#8a7fa0] dark:text-[#9d95b5] mb-8">Describe what you want to see</p>

        <div className="glass-card rounded-2xl p-5 mb-3 shadow-sm">
          <textarea
            className="w-full bg-transparent border-none outline-none font-sans text-[15px] text-[#1e1830] dark:text-[#f1eff8] resize-none min-h-[90px] leading-relaxed placeholder:text-[#b8afd0] dark:placeholder:text-[#6b6385]"
            placeholder="A misty Japanese garden at dawn, soft light filtering through bamboo..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleGenerate();
              }
            }}
          />
          <div className="flex items-center justify-between mt-4 pt-3.5 border-t border-black/5 dark:border-white/10">
            <div className="flex gap-1.5">
              {aspectRatios.map((s) => {
                const isSelected = size === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSize(s)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] transition-all font-sans cursor-pointer ${
                      isSelected
                        ? "badge-purple font-medium"
                        : "text-[#8a7fa0] dark:text-[#9d95b5] bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 hover:bg-black/10 dark:hover:bg-white/10"
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={loading || !prompt.trim()}
              className="px-5 py-2 rounded-xl text-sm font-medium text-white bg-[#2d2640] dark:bg-[#9d7cf0] dark:text-[#120f1e] dark:hover:bg-[#b096f6] transition-opacity disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 cursor-pointer"
            >
              {loading ? "Generating..." : "Generate"}
            </button>
          </div>
        </div>

        {error && (
          <p className="text-[13px] text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/50 rounded-lg px-3.5 py-2.5 mb-3">
            {error}
          </p>
        )}

        {image ? (
          <div className="relative rounded-2xl overflow-hidden shadow-sm">
            <img src={`data:image/png;base64,${image}`} alt="Generated artwork" className="w-full block rounded-2xl" />
            <a
              href={`data:image/png;base64,${image}`}
              download="generated.png"
              className="glass-button absolute bottom-3 right-3 px-3.5 py-1.5 rounded-lg text-xs font-medium text-[#2d2640] dark:text-[#f1eff8] hover:bg-white/90 dark:hover:bg-white/20 transition-colors"
            >
              Download image
            </a>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2.5 min-h-[200px] rounded-2xl text-[13px] text-[#b8afd0] dark:text-[#8a7fa0] bg-white/30 dark:bg-black/20 border border-dashed border-[#7c5cbf]/20 dark:border-[#9d7cf0]/30">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[#7c5cbf]/40 dark:text-[#9d7cf0]/50 border border-dashed border-[#7c5cbf]/20 dark:border-[#9d7cf0]/30">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <rect x="2" y="2" width="14" height="14" rx="3" stroke="currentColor" strokeWidth="1" />
                <circle cx="6.5" cy="6.5" r="1.5" stroke="currentColor" strokeWidth="1" />
                <path d="M2 12l4-3 3 2.5 3-4 4 4.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            Your generated image will appear here
          </div>
        )}
      </main>

      {showModal && <AuthModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
