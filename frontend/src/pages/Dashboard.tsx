import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { AuthModal } from "../components/AuthModal";
import { api } from "../services/api";

type Size = "1:1" | "16:9" | "9:16";

const sizeMap = {
  "1:1": { width: 1024, height: 1024 },
  "16:9": { width: 1024, height: 576 },
  "9:16": { width: 576, height: 1024 },
};

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [size, setSize] = useState<Size>("1:1");
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [demoCredits, setDemoCredits] = useState<number | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      api.getDemoCredits().then((data) => setDemoCredits(data.remaining));
    }
  }, [loading, user]);

  async function handleGenerate() {
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const { width, height } = sizeMap[size];

      if (user) {
        // user logged in, uses main route with their token
        const data = await api.generateImage(prompt, width, height);
        setImage(data.image_base64);
      } else {
        // visitor uses demo with shared token
        const data = await api.generateImageDemo(prompt, width, height);
        setImage(data.image_base64);
      }
    } catch (err: any) {
      if (err.message.includes("demo limit reached")) {
        setShowModal(true);
      } else if (err.message.includes("no credits") || err.message.includes("no token")) {
        setError("Add your NVIDIA token in settings to keep generating.");
      } else if (err.message.includes("content filter") || err.message.includes("Prompt blocked")) {
        setError("Your prompt was blocked by the content filter. Try rephrasing it.");
      } else {
        setError(err.message);
      }
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
      <div className="fixed -bottom-16 left-1/2 w-75 h-75 rounded-full opacity-20 pointer-events-none"
        style={{ background: "#bbf7d0", filter: "blur(90px)" }} />

      {/* navbar */}
      <nav className="sticky top-0 z-10 flex items-center justify-between px-7 py-4 border-b border-white/60"
        style={{ background: "rgba(255,255,255,0.45)", backdropFilter: "blur(20px)" }}>
        <span className="font-serif text-xl text-[#2d2640]">
          aether<em className="text-[#7c5cbf]">AI</em>
        </span>
        <div className="flex items-center gap-4">
          {user ? (
            <>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs text-[#7c5cbf]"
                style={{ background: "rgba(124,92,191,0.1)", border: "0.5px solid rgba(124,92,191,0.25)" }}>
                <div className="w-1.5 h-1.5 rounded-full bg-[#7c5cbf]" />
                Logged in!
              </div>
              <button onClick={logout}
                className="px-3 py-1.5 rounded-lg text-sm text-[#4a4060] transition-colors hover:cursor-pointer"
                style={{ background: "rgba(255,255,255,0.5)", border: "0.5px solid rgba(0,0,0,0.1)" }}>
                Sign out
              </button>
            </>
          ) : (
            <>
              {demoCredits !== null && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs text-[#7c5cbf]"
                  style={{ background: "rgba(124,92,191,0.1)", border: "0.5px solid rgba(124,92,191,0.25)" }}>
                  <div className="w-1.5 h-1.5 rounded-full bg-[#7c5cbf]" />
                  {demoCredits} demo credit{demoCredits !== 1 ? "s" : ""} left
                </div>
              )}
              <button onClick={() => setShowModal(true)}
                className="px-3 py-1.5 rounded-lg text-sm text-[#4a4060] transition-colors hover:cursor-pointer"
                style={{ background: "rgba(255,255,255,0.5)", border: "0.5px solid rgba(0,0,0,0.1)" }}>
                Sign in
              </button>
            </>
          )}
        </div>
      </nav>

      {/* main */}
      <main className="relative z-10 max-w-xl mx-auto px-6 pt-14 pb-10">
        <h1 className="font-serif text-4xl text-[#1e1830] leading-tight mb-2">
          Generate<br /><em className="text-[#7c5cbf]">anything.</em>
        </h1>
        <p className="text-sm text-[#8a7fa0] mb-8">Describe what you want to see</p>

        {/* prompt card */}
        <div className="rounded-2xl p-5 mb-3 shadow-sm"
          style={{ background: "rgba(255,255,255,0.55)", border: "0.5px solid rgba(255,255,255,0.8)", backdropFilter: "blur(24px)" }}>
          <textarea
            className="w-full bg-transparent border-none outline-none font-sans text-[15px] text-[#1e1830] resize-none min-h-22.5 leading-relaxed placeholder:text-[#b8afd0]"
            placeholder="A misty Japanese garden at dawn, soft light filtering through bamboo..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && e.metaKey) handleGenerate(); }}
          />
          <div className="flex items-center justify-between mt-4 pt-3.5 border-t border-black/6">
            <div className="flex gap-1.5">
              {(["1:1", "16:9", "9:16"] as Size[]).map((s) => (
                <button key={s} onClick={() => setSize(s)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] transition-all font-sans hover:cursor-pointer
                    ${size === s
                      ? "text-[#7c5cbf]"
                      : "text-[#8a7fa0]"}`}
                  style={size === s
                    ? { background: "rgba(124,92,191,0.1)", border: "0.5px solid rgba(124,92,191,0.3)" }
                    : { background: "rgba(0,0,0,0.04)", border: "0.5px solid rgba(0,0,0,0.08)" }}>
                  {s}
                </button>
              ))}
            </div>
            <button onClick={handleGenerate}
              disabled={loading || !prompt.trim()}
              className="px-5 py-2 rounded-xl text-sm font-medium text-white bg-[#2d2640] transition-opacity disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-85 hover:cursor-pointer">
              {loading ? "Generating..." : "Generate"}
            </button>
          </div>
        </div>

        {/* err */}
        {error && (
          <p className="text-[13px] text-red-700 bg-red-50 border border-red-100 rounded-lg px-3.5 py-2.5 mb-3">
            {error}
          </p>
        )}

        {/* result */}
        {image ? (
          <div className="relative rounded-2xl overflow-hidden">
            <img src={`data:image/png;base64,${image}`} alt="generated" className="w-full block rounded-2xl" />
            <a href={`data:image/png;base64,${image}`} download="generated.png"
              className="absolute bottom-3 right-3 px-3.5 py-1.5 rounded-lg text-xs text-[#2d2640] no-underline"
              style={{ background: "rgba(255,255,255,0.75)", backdropFilter: "blur(8px)", border: "0.5px solid rgba(255,255,255,0.9)" }}>
              download
            </a>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2.5 min-h-50 rounded-2xl text-[13px] text-[#b8afd0]"
            style={{ background: "rgba(255,255,255,0.3)", border: "0.5px dashed rgba(124,92,191,0.2)" }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-purple-200"
              style={{ border: "1px dashed rgba(124,92,191,0.2)" }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <rect x="2" y="2" width="14" height="14" rx="3" stroke="currentColor" strokeWidth="1" />
                <circle cx="6.5" cy="6.5" r="1.5" stroke="currentColor" strokeWidth="1" />
                <path d="M2 12l4-3 3 2.5 3-4 4 4.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            your image will appear here
          </div>
        )}
      </main>

      {showModal && <AuthModal onClose={() => setShowModal(false)} />}
    </div>
  );
}