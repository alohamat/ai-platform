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
  const [demoCredits, setDemoCredits] = useState<{ remaining: number; editRemaining: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!loading && !user) {
      api.getDemoCredits()
        .then((data) => setDemoCredits(data))
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
    setMode(newMode);
    setError(null);
    if (newMode === "edit" && steps <= 4) {
      setSteps(20);
    } else if (newMode === "generate" && steps > 4) {
      setSteps(4);
    }
  }

  function handleEditExistingImage(imageSrc: string) {
    const fullDataUrl = imageSrc.startsWith("data:")
      ? imageSrc
      : `data:image/png;base64,${imageSrc}`;
    setReferenceImage(fullDataUrl);
    setEditedImage(null);
    setMode("edit");
    setPrompt("");
    if (steps <= 4) {
      setSteps(20);
    }
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
        const data = user
          ? await api.editImage(prompt.trim(), referenceImage!, width, height, steps)
          : await api.editImageDemo(prompt.trim(), referenceImage!, steps);
        setEditedImage(data.image_base64);
      } else {
        const data = user
          ? await api.generateImage(prompt.trim(), width, height, steps)
          : await api.generateImageDemo(prompt.trim(), width, height);

        setGeneratedImage(data.image_base64);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Request failed";

      if (message.includes("demo limit reached") || message.includes("demo edit limit reached")) {
        setShowModal(true);
      } else if (message.includes("no hugging face token")) {
        setError("Add your Hugging Face token in Settings to keep editing images.");
      } else if (message.includes("no credits") || message.includes("no token") || message.includes("no token configured")) {
        setError("Add your API token in settings to keep generating.");
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
      <Navbar demoCredits={demoCredits} mode={mode} onOpenAuth={() => setShowModal(true)} />

      <main className="relative z-10 max-w-2xl mx-auto px-6 pt-10 pb-16">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-serif text-4xl leading-tight">
              {mode === "generate" ? (
                <>Generate<br /><em className="text-[#7c5cbf] dark:text-[#9d7cf0] not-italic font-serif">anything.</em></>
              ) : (
                <>Edit<br /><em className="text-[#7c5cbf] dark:text-[#9d7cf0] not-italic font-serif">with InstructPix2Pix.</em></>
              )}
            </h1>
            <p className="text-sm text-[#8a7fa0] dark:text-[#9d95b5] mt-1">
              {mode === "generate"
                ? "Describe what you want to see"
                : "Describe changes to apply to your reference image"}
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
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                    isDragging
                      ? "border-[#7c5cbf] bg-[#7c5cbf]/5 dark:bg-[#9d7cf0]/10"
                      : "border-black/15 dark:border-white/15 hover:border-black/30 dark:hover:border-white/30 bg-black/[0.02] dark:bg-white/[0.02]"
                  }`}
                >
                  <svg
                    className="w-8 h-8 mx-auto mb-2 text-[#8a7fa0] dark:text-[#9d95b5]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.5"
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <p className="text-sm font-medium text-[#1e1830] dark:text-[#f1eff8]">
                    Drop an image here, paste from clipboard (Ctrl+V), or <span className="text-[#7c5cbf] dark:text-[#9d7cf0]">browse</span>
                  </p>
                  <p className="text-xs text-[#8a7fa0] dark:text-[#9d95b5] mt-1">PNG, JPG, or WebP up to 10MB</p>
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
                : "Describe changes to make (e.g. 'Add cozy sunglasses to them', 'Make it sunset with warm golden light')..."
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
                    {mode === "edit"
                      ? (steps <= 20 ? "Fast" : "High Quality")
                      : (steps <= 2 ? "Fast" : "Detailed")}
                  </span>
                </div>
                <input
                  type="range"
                  min={mode === "edit" ? 10 : 1}
                  max={mode === "edit" ? 50 : 4}
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
            {loading && (
              <div className="glass-card rounded-2xl h-[420px] flex flex-col items-center justify-center gap-3 shadow-sm">
                <div className="w-6 h-6 border-2 border-[#7c5cbf] dark:border-[#9d7cf0] border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-[#8a7fa0] dark:text-[#9d95b5]">Generating image with FLUX.2 Klein 4B...</p>
              </div>
            )}

            {!loading && generatedImage && (
              <div className="glass-card rounded-2xl p-4 shadow-sm">
                <img
                  src={`data:image/png;base64,${generatedImage}`}
                  alt="Generated"
                  className="w-full rounded-xl object-contain max-h-[600px]"
                />
                <div className="mt-3 flex items-center justify-between pt-3 border-t border-black/5 dark:border-white/10">
                  <span className="text-xs text-[#8a7fa0] dark:text-[#9d95b5] truncate max-w-sm">
                    {prompt}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleEditExistingImage(generatedImage)}
                      className="glass-button px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer flex items-center gap-1.5 hover:bg-white/80 dark:hover:bg-white/10"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                      </svg>
                      Edit image
                    </button>
                    <a
                      href={`data:image/png;base64,${generatedImage}`}
                      download="generated.png"
                      className="glass-button px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer hover:bg-white/80 dark:hover:bg-white/10"
                    >
                      Download
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {mode === "edit" && (
          <div>
            {loading && (
              <div className="glass-card rounded-2xl h-[420px] flex flex-col items-center justify-center gap-3 shadow-sm">
                <div className="w-6 h-6 border-2 border-[#7c5cbf] dark:border-[#9d7cf0] border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-[#8a7fa0] dark:text-[#9d95b5]">Applying edits with InstructPix2Pix...</p>
              </div>
            )}

            {!loading && editedImage && referenceImage && (
              <div className="glass-card rounded-2xl p-4 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-[#8a7fa0] dark:text-[#9d95b5] mb-2 font-medium">Original</p>
                    <img
                      src={referenceImage}
                      alt="Original reference"
                      className="w-full rounded-xl object-contain max-h-[380px] border border-black/5 dark:border-white/10"
                    />
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-[#7c5cbf] dark:text-[#9d7cf0] mb-2 font-medium">Edited</p>
                    <img
                      src={`data:image/png;base64,${editedImage}`}
                      alt="Edited"
                      className="w-full rounded-xl object-contain max-h-[380px] border border-black/5 dark:border-white/10"
                    />
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between pt-3 border-t border-black/5 dark:border-white/10">
                  <span className="text-xs text-[#8a7fa0] dark:text-[#9d95b5] truncate max-w-sm">
                    {prompt}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleEditExistingImage(editedImage)}
                      className="glass-button px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer flex items-center gap-1.5 hover:bg-white/80 dark:hover:bg-white/10"
                    >
                      Iterate on this edit
                    </button>
                    <a
                      href={`data:image/png;base64,${editedImage}`}
                      download="edited.png"
                      className="glass-button px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer hover:bg-white/80 dark:hover:bg-white/10"
                    >
                      Download
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {showModal && <AuthModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
