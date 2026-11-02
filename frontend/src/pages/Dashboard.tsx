import { useEffect, useState, useRef } from "react";
import { useAuth } from "../contexts/useAuth";
import { AuthModal } from "../components/AuthModal";
import { Navbar } from "../components/Navbar";
import { BackgroundOrbs } from "../components/BackgroundOrbs";
import { api } from "../services/api";
import { processImageFile } from "../utils/image";

type Mode = "generate" | "edit";
type Size = "1:1" | "16:9" | "9:16";

const sizeMap: Record<Size, { width: number; height: number }> = {
  "1:1": { width: 1024, height: 1024 },
  "16:9": { width: 1024, height: 576 },
  "9:16": { width: 576, height: 1024 },
};

const aspectRatios: Size[] = ["1:1", "16:9", "9:16"];

export default function Dashboard() {
  const { user } = useAuth();
  const [mode, setMode] = useState<Mode>("generate");
  const [prompt, setPrompt] = useState("");
  const [size, setSize] = useState<Size>("1:1");
  const [steps, setSteps] = useState(4);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [editedImage, setEditedImage] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [demoCredits, setDemoCredits] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!loading && !user) {
      api.getDemoCredits()
        .then((data) => setDemoCredits(data.remaining))
        .catch(() => setDemoCredits(null));
    }
  }, [loading, user]);

  useEffect(() => {
    function handlePaste(e: ClipboardEvent) {
      if (mode !== "edit" || !e.clipboardData) return;
      const items = e.clipboardData.items;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            loadReferenceFile(file);
            break;
          }
        }
      }
    }
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [mode]);

  async function loadReferenceFile(file: File) {
    try {
      setError(null);
      const dataUrl = await processImageFile(file);
      setReferenceImage(dataUrl);
      setEditedImage(null);
    } catch {
      setError("Failed to load reference image. Please try a different file.");
    }
  }

  function handleModeChange(newMode: Mode) {
    if (newMode === "edit" && !user) {
      setShowModal(true);
      return;
    }
    setMode(newMode);
    setError(null);
  }

  function handleEditExistingImage(imageSrc: string) {
    if (!user) {
      setShowModal(true);
      return;
    }
    const fullDataUrl = imageSrc.startsWith("data:")
      ? imageSrc
      : `data:image/png;base64,${imageSrc}`;
    setReferenceImage(fullDataUrl);
    setEditedImage(null);
    setMode("edit");
    setPrompt("");
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => textareaRef.current?.focus(), 100);
  }

  async function handleAction() {
    if (!prompt.trim() || loading) return;

    if (mode === "edit" && !referenceImage) {
      setError("Please provide a reference image to edit.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { width, height } = sizeMap[size];

      if (mode === "edit") {
        if (!user) {
          setShowModal(true);
          return;
        }
        const data = await api.editImage(prompt.trim(), referenceImage!, width, height, steps);
        setEditedImage(data.image_base64);
      } else {
        const data = user
          ? await api.generateImage(prompt.trim(), width, height, steps)
          : await api.generateImageDemo(prompt.trim(), width, height);

        setGeneratedImage(data.image_base64);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Request failed";

      if (message.includes("demo limit reached")) {
        setShowModal(true);
      } else if (message.includes("no credits") || message.includes("no token") || message.includes("no token configured")) {
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

      <main className="relative z-10 max-w-2xl mx-auto px-6 pt-10 pb-16">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-serif text-4xl leading-tight">
              {mode === "generate" ? (
                <>Generate<br /><em className="text-[#7c5cbf] dark:text-[#9d7cf0] not-italic font-serif">anything.</em></>
              ) : (
                <>Edit<br /><em className="text-[#7c5cbf] dark:text-[#9d7cf0] not-italic font-serif">with precision.</em></>
              )}
            </h1>
            <p className="text-sm text-[#8a7fa0] dark:text-[#9d95b5] mt-1">
              {mode === "generate" ? "Describe what you want to see" : "Describe changes to apply to your reference image"}
            </p>
          </div>

          <div className="flex gap-1 p-1 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 self-start">
            <button
              type="button"
              onClick={() => handleModeChange("generate")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                mode === "generate"
                  ? "bg-white dark:bg-[#2d2640] text-[#1e1830] dark:text-[#f1eff8] shadow-sm"
                  : "text-[#8a7fa0] dark:text-[#9d95b5] hover:text-[#1e1830] dark:hover:text-[#f1eff8]"
              }`}
            >
              Generate
            </button>
            <button
              type="button"
              onClick={() => handleModeChange("edit")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                mode === "edit"
                  ? "bg-white dark:bg-[#2d2640] text-[#1e1830] dark:text-[#f1eff8] shadow-sm"
                  : "text-[#8a7fa0] dark:text-[#9d95b5] hover:text-[#1e1830] dark:hover:text-[#f1eff8]"
              }`}
            >
              Edit
            </button>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 mb-4 shadow-sm">
          {mode === "edit" && (
            <div className="mb-4 pb-4 border-b border-black/5 dark:border-white/10">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) loadReferenceFile(file);
                }}
              />

              {referenceImage ? (
                <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10">
                  <div className="flex items-center gap-3">
                    <img
                      src={referenceImage}
                      alt="Reference"
                      className="w-14 h-14 object-cover rounded-lg border border-black/10 dark:border-white/10"
                    />
                    <div>
                      <p className="text-xs font-medium text-[#1e1830] dark:text-[#f1eff8]">Reference image active</p>
                      <p className="text-[11px] text-[#8a7fa0] dark:text-[#9d95b5]">Ready for prompt-guided edits</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="glass-button px-2.5 py-1 rounded-lg text-xs cursor-pointer hover:bg-white/80 dark:hover:bg-white/10"
                    >
                      Replace
                    </button>
                    <button
                      type="button"
                      onClick={() => setReferenceImage(null)}
                      aria-label="Remove reference image"
                      className="glass-button px-2 py-1 rounded-lg text-xs cursor-pointer text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) loadReferenceFile(file);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex flex-col items-center justify-center p-6 rounded-xl border border-dashed transition-all cursor-pointer ${
                    isDragging
                      ? "border-[#7c5cbf] bg-[#7c5cbf]/10"
                      : "border-black/15 dark:border-white/15 bg-black/5 dark:bg-white/5 hover:border-[#7c5cbf]/60"
                  }`}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#7c5cbf] dark:text-[#9d7cf0] mb-2" aria-hidden="true">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" strokeLinejoin="round" />
                    <polyline points="17 8 12 3 7 8" strokeLinecap="round" strokeLinejoin="round" />
                    <line x1="12" y1="3" x2="12" y2="15" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <p className="text-xs font-medium text-[#1e1830] dark:text-[#f1eff8]">
                    Drop an image here, click to browse, or paste with Ctrl+V
                  </p>
                  <p className="text-[11px] text-[#8a7fa0] dark:text-[#9d95b5] mt-0.5">
                    PNG, JPEG or WEBP up to 1024×1024
                  </p>
                </div>
              )}
            </div>
          )}

          <textarea
            ref={textareaRef}
            className="w-full bg-transparent border-none outline-none font-sans text-[15px] text-[#1e1830] dark:text-[#f1eff8] resize-none min-h-[90px] leading-relaxed placeholder:text-[#b8afd0] dark:placeholder:text-[#6b6385]"
            placeholder={
              mode === "generate"
                ? "A misty Japanese garden at dawn, soft light filtering through bamboo..."
                : "Describe changes to make (e.g. 'Add a cozy cabin in the background, make it sunset with warm golden light')..."
            }
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleAction();
              }
            }}
          />

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-black/5 dark:border-white/10">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs text-[#8a7fa0] dark:text-[#9d95b5] hover:text-[#1e1830] dark:hover:text-[#f1eff8] flex items-center gap-1.5 cursor-pointer"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`transition-transform duration-200 ${showAdvanced ? "rotate-90" : ""}`}
                aria-hidden="true"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
              Advanced Settings
            </button>

            <button
              type="button"
              onClick={handleAction}
              disabled={loading || !prompt.trim() || (mode === "edit" && !referenceImage)}
              className="px-5 py-2 rounded-xl text-sm font-medium text-white bg-[#2d2640] dark:bg-[#9d7cf0] dark:text-[#120f1e] dark:hover:bg-[#b096f6] transition-opacity disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 cursor-pointer"
            >
              {loading ? (mode === "edit" ? "Editing..." : "Generating...") : (mode === "edit" ? "Apply edit" : "Generate")}
            </button>
          </div>

          {showAdvanced && (
            <div className="mt-4 pt-3.5 border-t border-black/5 dark:border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] uppercase tracking-wide text-[#8a7fa0] dark:text-[#9d95b5] mb-2 font-medium">
                  Aspect Ratio
                </label>
                <div className="flex gap-1.5">
                  {aspectRatios.map((s) => {
                    const isSelected = size === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSize(s)}
                        className={`px-3 py-1 rounded-lg text-xs transition-all font-sans cursor-pointer ${
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
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] uppercase tracking-wide text-[#8a7fa0] dark:text-[#9d95b5] font-medium">
                    Steps ({steps})
                  </label>
                  <span className="text-[11px] text-[#8a7fa0] dark:text-[#9d95b5]">
                    {steps <= 2 ? "Fast" : "Detailed"}
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="4"
                  value={steps}
                  onChange={(e) => setSteps(Number(e.target.value))}
                  className="w-full accent-[#7c5cbf] cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>

        {error && (
          <p className="text-[13px] text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/50 rounded-lg px-3.5 py-2.5 mb-4">
            {error}
          </p>
        )}

        {mode === "generate" && (
          <div>
            {generatedImage ? (
              <div className="relative rounded-2xl overflow-hidden shadow-sm">
                <img src={`data:image/png;base64,${generatedImage}`} alt="Generated artwork" className="w-full block rounded-2xl" />
                <div className="absolute bottom-3 right-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleEditExistingImage(generatedImage)}
                    className="glass-button px-3.5 py-1.5 rounded-lg text-xs font-medium text-[#2d2640] dark:text-[#f1eff8] hover:bg-white/90 dark:hover:bg-white/20 transition-colors cursor-pointer"
                  >
                    Edit
                  </button>
                  <a
                    href={`data:image/png;base64,${generatedImage}`}
                    download="generated.png"
                    className="glass-button px-3.5 py-1.5 rounded-lg text-xs font-medium text-[#2d2640] dark:text-[#f1eff8] hover:bg-white/90 dark:hover:bg-white/20 transition-colors"
                  >
                    Download image
                  </a>
                </div>
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
          </div>
        )}

        {mode === "edit" && (
          <div>
            {editedImage && referenceImage ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="relative rounded-2xl overflow-hidden shadow-sm border border-black/10 dark:border-white/10">
                    <span className="absolute top-2.5 left-2.5 z-10 px-2 py-0.5 rounded-md text-[10px] font-medium bg-black/60 text-white backdrop-blur-sm">
                      Original
                    </span>
                    <img src={referenceImage} alt="Original reference" className="w-full h-auto object-cover rounded-2xl block" />
                  </div>

                  <div className="relative rounded-2xl overflow-hidden shadow-sm border border-black/10 dark:border-white/10">
                    <span className="absolute top-2.5 left-2.5 z-10 px-2 py-0.5 rounded-md text-[10px] font-medium bg-[#7c5cbf] text-white backdrop-blur-sm">
                      Edited
                    </span>
                    <img src={`data:image/png;base64,${editedImage}`} alt="Edited artwork" className="w-full h-auto object-cover rounded-2xl block" />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => handleEditExistingImage(editedImage)}
                    className="glass-button px-3.5 py-2 rounded-xl text-xs font-medium text-[#2d2640] dark:text-[#f1eff8] hover:bg-white/90 dark:hover:bg-white/20 transition-colors cursor-pointer"
                  >
                    Continue editing this result
                  </button>
                  <a
                    href={`data:image/png;base64,${editedImage}`}
                    download="edited.png"
                    className="glass-button px-4 py-2 rounded-xl text-xs font-medium text-[#2d2640] dark:text-[#f1eff8] hover:bg-white/90 dark:hover:bg-white/20 transition-colors"
                  >
                    Download edited image
                  </a>
                </div>
              </div>
            ) : referenceImage ? (
              <div className="rounded-2xl p-4 bg-white/30 dark:bg-black/20 border border-black/5 dark:border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img src={referenceImage} alt="Preview" className="w-12 h-12 object-cover rounded-lg" />
                  <p className="text-xs text-[#8a7fa0] dark:text-[#9d95b5]">
                    Reference loaded. Type instructions above and click &quot;Apply edit&quot;.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-2.5 min-h-[160px] rounded-2xl text-[13px] text-[#b8afd0] dark:text-[#8a7fa0] bg-white/30 dark:bg-black/20 border border-dashed border-[#7c5cbf]/20 dark:border-[#9d7cf0]/30">
                Provide or paste an image above to start editing
              </div>
            )}
          </div>
        )}
      </main>

      {showModal && <AuthModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
