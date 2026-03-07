
import React, { useState, useRef, useEffect } from 'react';
import { generateAIImage } from '../services/geminiService';
import AuthRobot from './AuthRobot';

interface HistoryItem {
  id: string;
  url: string;
  prompt: string;
  date: string;
  type: string;
  timestamp?: number;
}

interface MagicImageModeProps {
  theme: 'light' | 'dark';
}

const MagicImageMode: React.FC<MagicImageModeProps> = ({ theme }) => {
  const [aspectRatio, setAspectRatio] = useState<string>('1:1');
  const [prompt, setPrompt] = useState('');
  const [uploadedImage, setUploadedImage] = useState<{ data: string, mimeType: string } | null>(null);
  const [referenceImage, setReferenceImage] = useState<{ data: string, mimeType: string } | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);

  const [history, setHistory] = useState<HistoryItem[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('magic_canvas_history');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) { }
      }
    }
    return [];
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('magic_canvas_history', JSON.stringify(history));
    }
  }, [history]);

  const [activeTab, setActiveTab] = useState<'IMAGES' | 'VIDEOS'>('IMAGES');
  // Filters currently being typed
  const [inputStartDate, setInputStartDate] = useState('');
  const [inputEndDate, setInputEndDate] = useState('');

  // Filters actually applied to the view
  const [appliedStartDate, setAppliedStartDate] = useState('');
  const [appliedEndDate, setAppliedEndDate] = useState('');

  const handleGetReport = () => {
    setAppliedStartDate(inputStartDate);
    setAppliedEndDate(inputEndDate);
  };

  // Preview State
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [zoomScale, setZoomScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handlePreviewOpen = (imgSrc: string) => {
    setPreviewImage(imgSrc);
    setZoomScale(1);
    setPan({ x: 0, y: 0 });
  };

  const [isWhiteBackground, setIsWhiteBackground] = useState(false);
  const [isDesignMode, setIsDesignMode] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const referenceInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        setUploadedImage({ data: base64String, mimeType: file.type });
        setResultImage(null);
        setIsDesignMode(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleReferenceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        setReferenceImage({ data: base64String, mimeType: file.type });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() && !uploadedImage) return;

    setIsLoading(true);
    setLoadingStep('Initializing Nano Banana Engine...');
    setError(null);
    setResultImage(null);

    try {
      setLoadingStep('Processing Pixels...');
      const resultUrl = await generateAIImage(prompt, aspectRatio, uploadedImage || undefined, referenceImage || undefined, isWhiteBackground, isDesignMode);

      if (resultUrl) {
        setResultImage(resultUrl);

        // Add to history
        const newItem: HistoryItem = {
          id: Date.now().toString(),
          url: resultUrl,
          prompt: prompt || 'Image Variation',
          date: new Date().toLocaleString('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          }),
          type: 'Img (1)',
          timestamp: Date.now()
        };
        setHistory(prev => [newItem, ...prev]);
      } else {
        throw new Error("The model returned no result. Please try a different prompt.");
      }
    } catch (err: any) {
      console.error("Generation Error:", err);
      let errorMessage = err.message || "An unexpected error occurred.";

      if (errorMessage.includes("403") || errorMessage.includes("permission")) {
        errorMessage = "Access Denied (403): API Key issue. Ensure your key is valid and has billing/quota enabled.";
      }

      setError(errorMessage);
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  const clearAll = () => {
    setUploadedImage(null);
    setReferenceImage(null);
    setResultImage(null);
    setPrompt('');
    setError(null);
    setIsWhiteBackground(false);
    setIsDesignMode(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (referenceInputRef.current) {
      referenceInputRef.current.value = '';
    }
  };

  const availableRatios = ['1:1', '9:16', '16:9', '4:3', '3:4'];

  return (
    <div className="flex-1 h-full overflow-y-auto p-4 md:p-8 flex flex-col items-center relative">
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-[100px] animate-pulse transition-colors duration-1000 bg-purple-600/10" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full blur-[100px] animate-pulse delay-1000 transition-colors duration-1000 bg-blue-600/10" />
      </div>

      <div className="z-10 w-full max-w-5xl space-y-8">

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <div className="space-y-6">
            <div className="bg-white/5 backdrop-blur-md p-6 rounded-[2.5rem] border border-white/10 space-y-6">
              <div className="flex items-center justify-between px-2">
                <label className="text-xs font-black text-slate-400 dark:text-white/30 uppercase tracking-[0.2em]">Input Image</label>

                {/* Mode Toggles */}
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <div className={`w-4 h-4 rounded-sm border transition-colors ${isWhiteBackground ? 'bg-white border-white' : 'border-white/30 group-hover:border-white/60'}`}>
                      {isWhiteBackground && <svg className="w-full h-full text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                    </div>
                    <input type="checkbox" checked={isWhiteBackground} onChange={(e) => setIsWhiteBackground(e.target.checked)} className="hidden" />
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${isWhiteBackground ? 'text-white' : 'text-slate-400 dark:text-white/40'}`}>White BG</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer group">
                    <div className={`w-4 h-4 rounded-sm border transition-colors ${isDesignMode ? 'bg-blue-500 border-blue-500' : 'border-white/30 group-hover:border-white/60'}`}>
                      {isDesignMode && <svg className="w-full h-full text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                    </div>
                    <input type="checkbox" checked={isDesignMode} onChange={(e) => setIsDesignMode(e.target.checked)} className="hidden" />
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${isDesignMode ? 'text-blue-400' : 'text-slate-400 dark:text-white/40'}`}>Design Mode</span>
                  </label>
                </div>
              </div>

              <div
                onClick={() => { if (!uploadedImage) fileInputRef.current?.click() }}
                onDoubleClick={() => { if (uploadedImage) handlePreviewOpen(`data:${uploadedImage.mimeType};base64,${uploadedImage.data}`) }}
                title={uploadedImage ? "Double click to preview zoom" : ""}
                className={`relative h-64 border-2 border-dashed rounded-[2rem] flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden group ${uploadedImage ? 'border-purple-500 bg-purple-500/5' : 'border-white/10 hover:border-white/30 hover:bg-white/5'}`}
              >
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />

                {uploadedImage ? (
                  <>
                    <img src={`data:${uploadedImage.mimeType};base64,${uploadedImage.data}`} alt="Upload" className="w-full h-full object-contain p-2" />
                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity gap-3">
                      <button onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }} className="text-white font-bold uppercase text-xs tracking-widest bg-white/20 px-4 py-2 rounded-full backdrop-blur-md hover:bg-white/30 transition-colors">Change Image</button>
                      <button onClick={(e) => { e.stopPropagation(); handlePreviewOpen(`data:${uploadedImage.mimeType};base64,${uploadedImage.data}`); }} className="text-blue-300 font-bold uppercase text-[10px] tracking-widest bg-blue-500/10 border border-blue-500/20 px-4 py-2 rounded-full backdrop-blur-md hover:bg-blue-500/20 transition-colors flex items-center gap-2">
                        <span>🔍</span>
                        <span>Preview</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setUploadedImage(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="text-red-400 font-bold uppercase text-[10px] tracking-widest bg-red-500/10 border border-red-500/20 px-4 py-2 rounded-full backdrop-blur-md hover:bg-red-500/20 transition-colors flex items-center gap-2"
                      >
                        <span>🗑️</span>
                        <span>Remove Image</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-center p-6 space-y-3">
                    <div className="w-16 h-16 mx-auto rounded-full bg-white/5 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                      📤
                    </div>
                    <p className="font-bold text-slate-600 dark:text-white/70">SELECT PRODUCT / IMAGE</p>
                    <p className="text-[10px] text-slate-400 dark:text-white/40 uppercase tracking-widest font-bold">Max file size: 5MB</p>
                  </div>
                )}
              </div>

              {/* Reference Image Section */}
              <div className="space-y-4 pt-4 border-t border-white/10">
                <label className="text-xs font-black text-slate-400 dark:text-white/30 uppercase tracking-[0.2em] px-2">Style / Background Reference</label>
                <div
                  onClick={() => { if (!referenceImage) referenceInputRef.current?.click() }}
                  onDoubleClick={() => { if (referenceImage) handlePreviewOpen(`data:${referenceImage.mimeType};base64,${referenceImage.data}`) }}
                  title={referenceImage ? "Double click to preview zoom" : ""}
                  className={`relative h-48 border-2 border-dashed rounded-[2rem] flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden group ${referenceImage ? 'border-pink-500 bg-pink-500/5' : 'border-white/10 hover:border-white/30 hover:bg-white/5'}`}
                >
                  <input ref={referenceInputRef} type="file" accept="image/*" onChange={handleReferenceUpload} className="hidden" />

                  {referenceImage ? (
                    <>
                      <img src={`data:${referenceImage.mimeType};base64,${referenceImage.data}`} alt="Reference" className="w-full h-full object-contain p-2" />
                      <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity gap-3">
                        <button onClick={(e) => { e.stopPropagation(); referenceInputRef.current?.click(); }} className="text-white font-bold uppercase text-xs tracking-widest bg-white/20 px-4 py-2 rounded-full backdrop-blur-md hover:bg-white/30 transition-colors">Change Reference</button>
                        <button onClick={(e) => { e.stopPropagation(); handlePreviewOpen(`data:${referenceImage.mimeType};base64,${referenceImage.data}`); }} className="text-blue-300 font-bold uppercase text-[10px] tracking-widest bg-blue-500/10 border border-blue-500/20 px-4 py-2 rounded-full backdrop-blur-md hover:bg-blue-500/20 transition-colors flex items-center gap-2">
                          <span>🔍</span>
                          <span>Preview</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setReferenceImage(null);
                            if (referenceInputRef.current) referenceInputRef.current.value = '';
                          }}
                          className="text-red-400 font-bold uppercase text-[10px] tracking-widest bg-red-500/10 border border-red-500/20 px-4 py-2 rounded-full backdrop-blur-md hover:bg-red-500/20 transition-colors flex items-center gap-2"
                        >
                          <span>🗑️</span>
                          <span>Remove</span>
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center p-6 space-y-3">
                      <div className="w-12 h-12 mx-auto rounded-full bg-white/5 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                        🎨
                      </div>
                      <p className="font-bold text-sm text-slate-600 dark:text-white/70">UPLOAD REFERENCE</p>
                      <p className="text-[9px] text-slate-400 dark:text-white/40 uppercase tracking-widest font-bold">Style / Background</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Aspect Ratio Selector */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-2">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-white/40 uppercase tracking-widest">Aspect Ratio</label>
                  <span className="text-[10px] font-mono text-purple-400 font-bold">{aspectRatio}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {availableRatios.map(ratio => (
                    <button
                      key={ratio}
                      onClick={() => setAspectRatio(ratio)}
                      className={`flex-1 min-w-[60px] py-3 rounded-2xl text-xs font-black border transition-all active:scale-95 ${aspectRatio === ratio
                        ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20'
                        : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10 hover:text-white/70'
                        }`}
                    >
                      {ratio}
                    </button>
                  ))}
                </div>
              </div>

              {/* Prompt Area */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-2">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-white/30 uppercase tracking-widest">Prompt</label>
                  <button onClick={() => setPrompt('')} className="text-[10px] font-bold text-red-400 uppercase tracking-widest hover:underline">Clear</button>
                </div>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={uploadedImage ? "Example: add micro jewelry, change background to a luxury store..." : "Example: A cinematic shot of a futuristic sports car..."}
                  className="w-full h-32 p-5 rounded-[1.5rem] bg-black/20 border border-white/10 outline-none resize-none font-medium placeholder-white/20 transition-all focus:ring-2 focus:ring-blue-500/50 text-white"
                />
              </div>

              <button
                onClick={handleGenerate}
                disabled={isLoading || (!prompt.trim() && !uploadedImage)}
                className="w-full py-5 rounded-[1.5rem] font-black text-white uppercase tracking-[0.2em] text-sm hover:scale-[1.02] active:scale-95 transition-all shadow-2xl disabled:opacity-50 disabled:scale-100 bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center gap-3"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white animate-spin rounded-full" />
                    <span>Generating...</span>
                  </div>
                ) : (
                  <>
                    <span>✨</span>
                    <span>Generate Magic</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Result Section */}
          <div className="flex flex-col gap-6">
            <div className={`relative h-full min-h-[500px] rounded-[2.5rem] bg-black/40 backdrop-blur-sm border border-white/10 flex items-center justify-center overflow-hidden shadow-2xl group`}>
              <div className="absolute top-6 left-6 z-10">
                <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/70">
                  Workspace Output
                </div>
              </div>

              {isLoading ? (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-xl transition-all duration-500">
                  <div className="relative z-10 scale-125 mb-8">
                    <AuthRobot state="typing" />
                  </div>
                  <div className="relative z-10 text-center space-y-3">
                    <h3 className="text-2xl font-black text-white uppercase tracking-tighter animate-pulse">
                      Rendering Neural Assets
                    </h3>
                    <p className="text-[10px] font-bold text-blue-400 uppercase tracking-[0.3em]">
                      {loadingStep || 'Synchronizing with Nano Banana...'}
                    </p>
                  </div>
                  <div className="mt-8 w-64 h-1 bg-white/10 rounded-full overflow-hidden relative">
                    <div className="absolute top-0 left-0 h-full w-full animate-[progress_2s_ease-in-out_infinite] bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500" style={{ transformOrigin: 'left' }} />
                  </div>
                </div>
              ) : resultImage ? (
                <div
                  className="relative w-full h-full flex items-center justify-center bg-black cursor-pointer"
                  onDoubleClick={() => handlePreviewOpen(resultImage)}
                  title="Double click to preview zoom"
                >
                  <img src={resultImage} alt="Magic Result" className="w-full h-full object-contain" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <a
                    href={resultImage}
                    download={`sahayak-magic-${Date.now()}.png`}
                    className="absolute bottom-10 px-8 py-4 bg-white text-black rounded-full font-black uppercase tracking-widest shadow-2xl hover:scale-110 transition-transform flex items-center gap-3 z-20 opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 duration-300"
                  >
                    <span>💾</span>
                    <span>Export Result</span>
                  </a>
                </div>
              ) : (
                <div className="text-center p-12">
                  <div className="w-24 h-24 mx-auto rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-5xl mb-6 grayscale opacity-30">
                    ✨
                  </div>
                  <p className="font-black text-2xl uppercase tracking-[0.2em] text-white/20">
                    Magic Canvas
                  </p>
                  <p className="text-xs font-bold mt-3 text-white/10 uppercase tracking-widest">Output will appear in this workspace</p>
                </div>
              )}

              {error && (
                <div className="absolute inset-0 bg-black/90 flex items-center justify-center p-8 z-[60]">
                  <div className="bg-red-500/10 border border-red-500/30 p-8 rounded-[2rem] text-center backdrop-blur-xl max-w-sm">
                    <div className="text-5xl mb-4">⚠️</div>
                    <h4 className="text-white font-black uppercase tracking-widest mb-2">Engine Warning</h4>
                    <p className="text-red-400 text-sm font-medium leading-relaxed mb-6">{error}</p>
                    <button onClick={() => setError(null)} className="w-full py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                      Re-sync Engine
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Usage Report Section */}
        <div className="mt-12 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-white">Usage Report</h3>
          </div>

          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 space-y-2">
              <label className="text-xs font-bold text-slate-400">Start Date</label>
              <div className="relative">
                <input
                  type="date"
                  value={inputStartDate}
                  onChange={(e) => setInputStartDate(e.target.value)}
                  className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 [color-scheme:dark]"
                />
              </div>
            </div>
            <div className="flex-1 space-y-2">
              <label className="text-xs font-bold text-slate-400">End Date</label>
              <div className="relative">
                <input
                  type="date"
                  value={inputEndDate}
                  onChange={(e) => setInputEndDate(e.target.value)}
                  className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 [color-scheme:dark]"
                />
              </div>
            </div>
            <div className="flex items-end">
              <button
                className="px-8 py-3 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-bold rounded-xl transition-colors h-[46px]"
              >
                Get Report
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 mt-6">
            <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-5 flex items-center justify-between md:justify-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center text-yellow-500 text-2xl">
                🖼️
              </div>
              <div className="md:ml-2 text-right md:text-left">
                <div className="text-xs font-medium text-slate-400">Used Image</div>
                <div className="text-2xl font-bold text-white">
                  {history.filter(item => {
                    if (!appliedStartDate && !appliedEndDate) return true;
                    let itemTime = item.timestamp;
                    if (!itemTime) {
                      const dateStr = item.date.split(',')[0].trim();
                      const dateParts = dateStr.split('/');
                      if (dateParts.length === 3) {
                        itemTime = new Date(`${dateParts[2]}-${dateParts[1]}-${dateParts[0]}T00:00:00`).getTime();
                      } else {
                        itemTime = Date.parse(dateStr);
                      }
                    }
                    let valid = true;
                    if (appliedStartDate) {
                      const startObj = new Date(appliedStartDate);
                      startObj.setHours(0, 0, 0, 0);
                      if (itemTime < startObj.getTime()) valid = false;
                    }
                    if (appliedEndDate) {
                      const endObj = new Date(appliedEndDate);
                      endObj.setHours(23, 59, 59, 999);
                      if (itemTime > endObj.getTime()) valid = false;
                    }
                    return valid;
                  }).length}
                </div>
              </div>
            </div>
          </div>

          <h3 className="text-lg font-bold text-white mt-8 mb-4">Detailed Usage History</h3>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveTab('IMAGES')}
              className={`px-8 py-2 rounded-2xl text-sm font-bold uppercase tracking-widest transition-all ${activeTab === 'IMAGES' ? 'bg-white/10 text-blue-400' : 'bg-transparent text-slate-500 hover:text-white/70'}`}
            >
              Images
            </button>
            <button
              onClick={() => setActiveTab('VIDEOS')}
              className={`px-8 py-2 rounded-2xl text-sm font-bold uppercase tracking-widest transition-all ${activeTab === 'VIDEOS' ? 'bg-white/10 text-blue-400' : 'bg-transparent text-slate-500 hover:text-white/70'}`}
            >
              Videos
            </button>
          </div>

          <div className="bg-slate-900/50 dark:bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
            {activeTab === 'IMAGES' ? (
              (() => {
                const filteredHistory = history.filter(item => {
                  if (!appliedStartDate && !appliedEndDate) return true;
                  let itemTime = item.timestamp;
                  if (!itemTime) {
                    const dateStr = item.date.split(',')[0].trim();
                    const dateParts = dateStr.split('/');
                    if (dateParts.length === 3) {
                      itemTime = new Date(`${dateParts[2]}-${dateParts[1]}-${dateParts[0]}T00:00:00`).getTime();
                    } else {
                      itemTime = Date.parse(dateStr);
                    }
                  }
                  let valid = true;
                  if (appliedStartDate) {
                    const startObj = new Date(appliedStartDate);
                    startObj.setHours(0, 0, 0, 0);
                    if (itemTime < startObj.getTime()) valid = false;
                  }
                  if (appliedEndDate) {
                    const endObj = new Date(appliedEndDate);
                    endObj.setHours(23, 59, 59, 999);
                    if (itemTime > endObj.getTime()) valid = false;
                  }
                  return valid;
                });

                return filteredHistory.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-400">
                      <thead className="bg-white/5 text-xs uppercase font-bold text-slate-300">
                        <tr>
                          <th className="px-6 py-4 rounded-tl-3xl">Type</th>
                          <th className="px-6 py-4">Date & Time</th>
                          <th className="px-6 py-4">Details</th>
                          <th className="px-6 py-4 rounded-tr-3xl">Usage</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {filteredHistory.map((item) => (
                          <tr
                            key={item.id}
                            className="hover:bg-white/5 transition-colors cursor-pointer group"
                            onClick={() => {
                              setResultImage(item.url);
                              setPrompt(item.prompt);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              handlePreviewOpen(item.url);
                            }}
                            title="Double click to preview zoom"
                          >
                            <td className="px-6 py-4">
                              <div className="w-12 h-12 rounded-lg overflow-hidden bg-black/50 border border-white/10 relative">
                                <img src={item.url} alt="thumbnail" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                  <span className="text-[10px] text-white font-bold">VIEW</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">{item.date}</td>
                            <td className="px-6 py-4 max-w-[200px] truncate" title={item.prompt}>
                              {item.prompt.length > 40 ? item.prompt.substring(0, 40) + '...' : item.prompt}
                            </td>
                            <td className="px-6 py-4 text-blue-400 font-bold">{item.type}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-12 text-center flex flex-col items-center justify-center gap-4">
                    <div className="text-4xl opacity-50">📂</div>
                    <p className="text-slate-500 font-medium">No images found for this period.</p>
                  </div>
                );
              })()
            ) : (
              <div className="p-12 text-center flex flex-col items-center justify-center gap-4">
                <div className="text-4xl opacity-50">🎥</div>
                <p className="text-slate-500 font-medium">Video generation history will appear here.</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-center pb-12">
          <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.5em] text-center">
            Secure Neural Pipeline • End-to-End Encryption • Powered by Nano Banana
          </p>
        </div>
      </div>

      {/* Full Screen Image Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center overflow-hidden backdrop-blur-md">
          <div className="absolute top-6 right-6 flex gap-4 z-[110]">
            <div className="bg-black/50 backdrop-blur-md rounded-full border border-white/10 flex items-center px-2 shadow-xl">
              <button
                onClick={(e) => { e.stopPropagation(); setZoomScale(s => s + 0.25); }}
                className="w-10 h-10 text-white text-xl flex items-center justify-center hover:text-blue-400 transition-colors"
                title="Zoom In"
              >
                +
              </button>
              <span className="text-white text-xs font-bold w-12 text-center">{Math.round(zoomScale * 100)}%</span>
              <button
                onClick={(e) => { e.stopPropagation(); setZoomScale(s => Math.max(0.25, s - 0.25)); }}
                className="w-10 h-10 text-white text-xl flex items-center justify-center hover:text-blue-400 transition-colors"
                title="Zoom Out"
              >
                -
              </button>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setPreviewImage(null); }}
              className="w-10 h-10 bg-white/10 text-white rounded-full text-xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-xl"
              title="Close Preview"
            >
              ✕
            </button>
          </div>

          <div
            className="w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing"
            onWheel={(e) => {
              setZoomScale(s => Math.max(0.1, s - e.deltaY * 0.002));
            }}
            onMouseDown={(e) => {
              setIsDragging(true);
              setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
            }}
            onMouseMove={(e) => {
              if (isDragging) {
                setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
              }
            }}
            onMouseUp={() => setIsDragging(false)}
            onMouseLeave={() => setIsDragging(false)}
          >
            <img
              src={previewImage}
              alt="Preview Zoom"
              className="max-w-full max-h-full object-contain transition-transform duration-75 ease-out shadow-2xl"
              style={{ transform: `scale(${zoomScale}) translate(${pan.x / zoomScale}px, ${pan.y / zoomScale}px)` }}
              draggable={false}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default MagicImageMode;
