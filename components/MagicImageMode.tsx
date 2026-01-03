
import React, { useState, useRef } from 'react';
import { generateAIImage } from '../services/geminiService';
import Orb from './Orb';

interface MagicImageModeProps {
  theme: 'light' | 'dark';
}

const MagicImageMode: React.FC<MagicImageModeProps> = ({ theme }) => {
  const [prompt, setPrompt] = useState('');
  const [uploadedImage, setUploadedImage] = useState<{ data: string, mimeType: string } | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        setUploadedImage({ data: base64String, mimeType: file.type });
        setGeneratedImage(null); // Reset previous result
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsLoading(true);
    setError(null);
    setGeneratedImage(null);

    try {
      // Calls the service which uses gemini-2.5-flash-image (Nano Banana logic)
      // If uploadedImage exists, it edits. If not, it creates from scratch.
      const result = await generateAIImage(prompt, uploadedImage || undefined);
      
      if (result) {
        setGeneratedImage(result);
      } else {
        setError("Image generation failed. Please try a different prompt.");
      }
    } catch (err) {
      setError("Something went wrong with the Magic Engine.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const clearAll = () => {
    setUploadedImage(null);
    setGeneratedImage(null);
    setPrompt('');
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex-1 h-full overflow-y-auto p-4 md:p-8 flex flex-col items-center relative">
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-pink-600/20 rounded-full blur-[100px] animate-pulse delay-1000" />
      </div>

      <div className="z-10 w-full max-w-4xl space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 bg-clip-text text-transparent animate-gradient-x">
            Magic Image Engine
          </h2>
          <p className="text-sm md:text-base text-slate-500 dark:text-white/50 font-bold uppercase tracking-widest">
            Nano Banana Architecture • Edit & Create
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Input Section */}
          <div className="space-y-6">
            {/* Upload Area */}
            <div 
              onClick={() => fileInputRef.current?.click()}
              className={`relative h-64 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden group ${uploadedImage ? 'border-purple-500 bg-purple-500/10' : 'border-slate-300 dark:border-white/20 hover:border-purple-400 hover:bg-slate-50 dark:hover:bg-white/5'}`}
            >
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              
              {uploadedImage ? (
                <>
                  <img src={`data:${uploadedImage.mimeType};base64,${uploadedImage.data}`} alt="Upload" className="w-full h-full object-contain p-2" />
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-white font-bold uppercase text-xs tracking-widest">Change Image</span>
                  </div>
                </>
              ) : (
                <div className="text-center p-6 space-y-3">
                  <div className="w-16 h-16 mx-auto rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center text-3xl">🖼️</div>
                  <p className="font-bold text-slate-600 dark:text-white/70">Click to Upload Reference</p>
                  <p className="text-[10px] text-slate-400 dark:text-white/40 uppercase tracking-widest">For Editing Mode</p>
                </div>
              )}
            </div>

            {/* Prompt Area */}
            <div className="space-y-3">
              <textarea 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={uploadedImage ? "Example: Add sunglasses, Make it cyberpunk style..." : "Example: A futuristic city made of crystal..."}
                className="w-full h-32 p-4 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:ring-2 focus:ring-purple-500 outline-none resize-none font-medium placeholder-slate-400 dark:placeholder-white/20"
              />
              <div className="flex gap-3">
                <button 
                  onClick={handleGenerate} 
                  disabled={isLoading || !prompt.trim()}
                  className="flex-1 py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-black text-white uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl disabled:opacity-50 disabled:scale-100"
                >
                  {isLoading ? 'Processing Magic...' : (uploadedImage ? 'Magic Edit' : 'Generate Art')}
                </button>
                {(uploadedImage || generatedImage || prompt) && (
                  <button 
                    onClick={clearAll} 
                    className="px-6 py-4 rounded-xl border border-red-500/30 text-red-500 hover:bg-red-500/10 font-bold flex items-center gap-2 transition-all hover:scale-105"
                    title="Clear Canvas"
                  >
                    <span>🗑️</span>
                    <span className="uppercase tracking-widest text-xs">Reset</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Result Section */}
          <div className={`relative h-full min-h-[400px] rounded-3xl bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10 flex items-center justify-center overflow-hidden shadow-inner ${isLoading ? 'animate-pulse' : ''}`}>
             
             {isLoading ? (
               <div className="flex flex-col items-center gap-6 z-20">
                 <Orb size="md" isThinking={true} theme={theme} />
                 <p className="text-purple-500 font-black uppercase tracking-widest animate-pulse">Constructing Pixels...</p>
               </div>
             ) : generatedImage ? (
               <div className="relative w-full h-full group">
                 <img src={generatedImage} alt="Magic Result" className="w-full h-full object-contain" />
                 <a 
                   href={generatedImage} 
                   download={`sahayak-magic-${Date.now()}.png`}
                   className="absolute bottom-6 right-6 px-6 py-3 bg-white text-black rounded-full font-bold shadow-xl hover:scale-110 transition-transform flex items-center gap-2"
                 >
                   <span>⬇️</span> Download
                 </a>
               </div>
             ) : (
               <div className="text-center opacity-30">
                 <div className="text-6xl mb-4">✨</div>
                 <p className="font-bold text-xl uppercase tracking-widest">Magic Canvas</p>
                 <p className="text-xs font-medium mt-2">Results will appear here</p>
               </div>
             )}

             {error && (
               <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-6">
                 <div className="bg-red-500/20 border border-red-500 text-red-200 p-4 rounded-xl text-center font-bold">
                   {error}
                   <button onClick={() => setError(null)} className="block w-full mt-2 text-xs uppercase tracking-widest underline">Dismiss</button>
                 </div>
               </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MagicImageMode;
