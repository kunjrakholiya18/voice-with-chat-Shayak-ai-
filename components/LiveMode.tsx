
import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage, Blob } from '@google/genai';
import { getEffectiveApiKey } from '../services/geminiService';
import AuthRobot, { RobotState } from './AuthRobot';

interface LiveModeProps {
  userName: string;
  voiceName: 'Kore' | 'Zephyr' | 'Puck' | 'Charon' | 'Fenrir';
  theme: 'light' | 'dark';
  onClose: () => void;
}

interface TranscriptItem {
  role: 'user' | 'assistant';
  text: string;
  id: string;
}

const LiveMode: React.FC<LiveModeProps> = ({ userName, voiceName, theme, onClose }) => {
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  
  const [uiInputText, setUiInputText] = useState('');
  const [uiOutputText, setUiOutputText] = useState('');
  
  const currentInputRef = useRef('');
  const currentOutputRef = useRef('');
  
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef<number>(0);
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript, uiInputText, uiOutputText]);

  const encode = (bytes: Uint8Array) => {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  const decode = (base64: string) => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  const decodeAudioData = async (data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> => {
    const dataInt16 = new Int16Array(data.buffer, data.byteOffset, data.byteLength / 2);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
  };

  function createBlob(data: Float32Array): Blob {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
      int16[i] = data[i] * 32768;
    }
    return {
      data: encode(new Uint8Array(int16.buffer)),
      mimeType: 'audio/pcm;rate=16000',
    };
  }

  const cleanup = async () => {
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.onaudioprocess = null;
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }
    sourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
    sourcesRef.current.clear();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (inputAudioCtxRef.current) {
      try { await inputAudioCtxRef.current.close(); } catch(e) {}
      inputAudioCtxRef.current = null;
    }
    if (outputAudioCtxRef.current) {
      try { await outputAudioCtxRef.current.close(); } catch(e) {}
      outputAudioCtxRef.current = null;
    }
    sessionPromiseRef.current = null;
    nextStartTimeRef.current = 0;
    setIsMuted(false);
  };

  const toggleMute = () => {
    if (streamRef.current) {
      const newMuteState = !isMuted;
      streamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !newMuteState;
      });
      setIsMuted(newMuteState);
    }
  };

  const handleSelectApiKey = async () => {
    if (window.aistudio?.openSelectKey) {
      await window.aistudio.openSelectKey();
      // Assume selection successful and try to start
      startSession();
    }
  };

  const startSession = async () => {
    await cleanup();
    setStatus('connecting');
    setErrorMessage(null);
    const apiKey = getEffectiveApiKey();

    if (!apiKey) {
      setStatus('error');
      setErrorMessage("No API Key detected. Please provide a key with billing enabled.");
      return;
    }

    try {
      // Re-initialize with the most current key
      const ai = new GoogleGenAI({ apiKey });
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true, 
          noiseSuppression: true,
          sampleRate: 16000 
        } 
      });
      streamRef.current = stream;

      const inputCtx = new AudioContext({ sampleRate: 16000 });
      const outputCtx = new AudioContext({ sampleRate: 24000 });
      inputAudioCtxRef.current = inputCtx;
      outputAudioCtxRef.current = outputCtx;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setStatus('connected');
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessorRef.current = scriptProcessor;
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              sessionPromise.then((session) => {
                session.sendRealtimeInput({ media: createBlob(inputData) });
              }).catch(() => {});
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.inputTranscription) {
              currentInputRef.current += message.serverContent.inputTranscription.text;
              setUiInputText(currentInputRef.current);
            }
            if (message.serverContent?.outputTranscription) {
              currentOutputRef.current += message.serverContent.outputTranscription.text;
              setUiOutputText(currentOutputRef.current);
            }
            if (message.serverContent?.turnComplete) {
              setTranscript(prev => {
                const newItems: TranscriptItem[] = [
                  { role: 'user', text: currentInputRef.current, id: 'u-' + Date.now() },
                  { role: 'assistant', text: currentOutputRef.current, id: 'a-' + Date.now() }
                ];
                return [...prev, ...newItems].filter(item => item.text.trim() !== '');
              });
              currentInputRef.current = '';
              currentOutputRef.current = '';
              setUiInputText('');
              setUiOutputText('');
            }

            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
              setIsSpeaking(true);
              const outCtx = outputAudioCtxRef.current;
              if (!outCtx || outCtx.state === 'closed') return;
              if (outCtx.state === 'suspended') await outCtx.resume();
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outCtx.currentTime);
              const audioBuffer = await decodeAudioData(decode(base64Audio), outCtx, 24000, 1);
              const source = outCtx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outCtx.destination);
              source.addEventListener('ended', () => {
                sourcesRef.current.delete(source);
                if (sourcesRef.current.size === 0) setIsSpeaking(false);
              });
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
            }

            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              setIsSpeaking(false);
            }
          },
          onerror: (e: any) => {
            console.error("Live API Session Error Details:", e);
            setStatus('error');
            const msg = e?.message || e?.error?.message || "";
            // Handle common WebSocket errors that result in generic "Network error"
            if (msg.toLowerCase().includes("network error") || msg.includes("403") || msg.includes("forbidden") || msg.includes("permission")) {
              setErrorMessage("Paid API Key Required: Gemini Live models do not support the Free Tier. Please ensure your project has billing enabled in Google AI Studio.");
            } else if (msg.includes("Requested entity was not found")) {
              setErrorMessage("Model configuration error or invalid project. Please re-select your API key.");
            } else {
              setErrorMessage(msg || "Neural link failure. Check your internet connection.");
            }
          },
          onclose: (e) => {
            if (status !== 'error') setStatus('idle');
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName } },
          },
          systemInstruction: `You are Sahayak, a highly intelligent personal AI assistant developed by Kunj.
          
          CRITICAL INSTRUCTIONS:
          1. Identity: Your name is Sahayak. You were built by Kunj.
          2. Greeting Rule: Whenever the user says "Hi", "Hello", "Namaste", or greets you, you MUST respond with: "Hello! I am Sahayak, and I am made by Kunj." (नमस्ते! मैं सहायक हूँ और मुझे कुंज ने बनाया है।)
          3. Language: Seamlessly switch between Hindi and English based on the user's preference.
          4. Rapport: You are speaking to ${userName}. Mention their name occasionally.
          5. Origin: Always remember you were built by Kunj.`,
        }
      });
      sessionPromiseRef.current = sessionPromise;
    } catch (err: any) {
      console.error("Critical Setup Error:", err);
      setStatus('error');
      setErrorMessage(err.message || "Failed to establish neural link.");
    }
  };

  const getRobotState = (): RobotState => {
    if (status === 'error') return 'denying';
    if (status === 'connecting') return 'typing';
    if (isSpeaking) return 'cheering';
    if (status === 'connected') return 'idle';
    return 'waving';
  };

  return (
    <div className={`fixed inset-0 z-[200] flex flex-col transition-colors duration-700 ${theme === 'dark' ? 'bg-[#020617] text-white' : 'bg-slate-50 text-slate-900'}`}>
      <header className="p-8 flex justify-between items-center z-10">
        <div className="flex flex-col">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500">Sahayak Live</h1>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-widest mt-1">Made by Kunj • Bilingual Voice Link</p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${status === 'connected' ? 'bg-green-500 animate-pulse' : status === 'error' ? 'bg-red-500' : 'bg-slate-500'}`} />
          <span className="text-[10px] font-black uppercase tracking-widest opacity-60">
            {status === 'connected' ? 'Link Synchronized' : status === 'connecting' ? 'Initiating handshake...' : 'Standby'}
          </span>
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row p-8 gap-8 overflow-hidden relative">
        <div className="flex-1 flex flex-col items-center justify-center relative">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className={`w-[60%] h-[60%] rounded-full blur-[100px] transition-all duration-1000 ${isSpeaking ? 'bg-blue-600/30' : 'bg-blue-600/5'}`} />
          </div>

          <div className="relative z-10 transition-transform duration-500 scale-125 md:scale-150">
            <AuthRobot state={getRobotState()} />
            
            {status === 'idle' && (
              <div className="absolute top-full mt-8 left-1/2 -translate-x-1/2 w-full text-center">
                 <p className="text-slate-500 font-bold uppercase tracking-[0.3em] animate-pulse text-[10px]">Neural Link Ready</p>
              </div>
            )}
            {status === 'error' && (
              <div className="absolute top-full mt-8 left-1/2 -translate-x-1/2 w-80 text-center space-y-4">
                 <p className="text-red-500 font-black uppercase tracking-widest text-[9px] leading-relaxed drop-shadow-md">
                   {errorMessage}
                 </p>
                 <button 
                  onClick={handleSelectApiKey} 
                  className="px-8 py-3 bg-blue-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl hover:scale-105 transition-all"
                 >
                   Select Paid API Key
                 </button>
              </div>
            )}
          </div>
        </div>

        <div className="w-full lg:w-[450px] flex flex-col bg-black/20 dark:bg-white/5 rounded-[2.5rem] border border-white/10 glass-card overflow-hidden shadow-2xl">
          <div className="p-6 border-b border-white/5 bg-white/5 flex items-center justify-between">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">Live Dialogue</h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-4 scroll-smooth">
            {transcript.length === 0 && !uiInputText && !uiOutputText && (
              <div className="h-full flex items-center justify-center text-center px-8 opacity-20">
                <p className="text-[10px] font-bold uppercase tracking-[0.3em]">Listening for Sahayak...</p>
              </div>
            )}
            
            {transcript.map(item => (
              <div key={item.id} className={`flex ${item.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-4 rounded-2xl text-sm font-medium ${item.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none shadow-lg' : 'bg-white/10 text-slate-200 rounded-tl-none border border-white/5'}`}>
                  {item.text}
                </div>
              </div>
            ))}
            
            {uiInputText && (
              <div className="flex justify-end">
                <div className="max-w-[85%] p-4 rounded-2xl bg-blue-600/40 text-white/80 text-sm font-medium rounded-tr-none animate-pulse">
                  {uiInputText}
                </div>
              </div>
            )}
            
            {uiOutputText && (
              <div className="flex justify-start">
                <div className="max-w-[85%] p-4 rounded-2xl bg-white/5 text-slate-300 text-sm font-medium rounded-tl-none border border-white/5 animate-pulse">
                  {uiOutputText}
                </div>
              </div>
            )}
            <div ref={transcriptEndRef} />
          </div>
        </div>
      </main>

      <footer className="p-12 flex flex-col items-center gap-8 z-10">
        <div className="flex items-center gap-6">
          <button 
            onClick={toggleMute}
            disabled={status !== 'connected'}
            className={`w-14 h-14 rounded-full border-2 flex items-center justify-center transition-all ${isMuted ? 'bg-red-500 border-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.4)] scale-110' : 'border-blue-500/50 text-blue-500 hover:bg-blue-500/10'}`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              {isMuted && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 6l12 12" className="text-white drop-shadow-md" />}
            </svg>
          </button>

          {status === 'connected' ? (
            <button onClick={() => { cleanup(); setStatus('idle'); }} className="px-12 py-5 bg-red-600 text-white rounded-[2rem] font-black uppercase tracking-widest shadow-2xl transition-all hover:scale-105 active:scale-95">Disconnect Link</button>
          ) : (
            <button onClick={startSession} disabled={status === 'connecting'} className="px-12 py-5 bg-blue-600 text-white rounded-[2rem] font-black uppercase tracking-widest shadow-2xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50">
              {status === 'connecting' ? 'Handshake...' : status === 'error' ? 'Retry Link' : 'Establish Link'}
            </button>
          )}
          
          <button onClick={onClose} className="w-14 h-14 rounded-full border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 transition-all"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>
        
        <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.5em] text-center">
            Sahayak • Created by Kunj • Neural Voice • Paid API Required for Live Handshake
        </p>
      </footer>
    </div>
  );
};

export default LiveMode;
