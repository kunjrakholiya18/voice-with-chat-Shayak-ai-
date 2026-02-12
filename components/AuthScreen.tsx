
import React, { useState, useEffect } from 'react';
import AuthRobot, { RobotState } from './AuthRobot';
import Orb from './Orb';

interface AuthScreenProps {
  onSuccess: (name: string, apiKey: string) => void;
  theme?: 'light' | 'dark';
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onSuccess, theme = 'dark' }) => {
  const [step, setStep] = useState<'name' | 'key'>('name');
  const [name, setName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [robotState, setRobotState] = useState<RobotState>('waving');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setRobotState('idle'), 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setRobotState('denying');
      setError('Please tell me your name first.');
      return;
    }
    setError('');
    setRobotState('cheering');
    setTimeout(() => {
      setStep('key');
      setRobotState('idle');
    }, 500);
  };

  const handleSelectKey = async () => {
    if (window.aistudio?.openSelectKey) {
      setRobotState('typing');
      await window.aistudio.openSelectKey();
      // Proceed after selection
      handleSubmit(new Event('submit') as any);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setRobotState('cheering');
    
    // Key might come from manual input or be pre-configured in process.env
    const finalKey = apiKey.trim() || process.env.API_KEY || '';
    
    setTimeout(() => {
      onSuccess(name.trim(), finalKey);
    }, 1200);
  };

  return (
    <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-black overflow-hidden relative px-6 py-12 transition-colors duration-500 font-sans">
      <div className="absolute top-1/4 -left-20 opacity-20"><Orb size="lg" theme="dark" /></div>
      <div className="absolute bottom-1/4 -right-20 opacity-20"><Orb size="md" theme="dark" /></div>
      
      <div className="mb-8 z-20 transition-transform duration-700 hover:scale-110">
        <AuthRobot state={robotState} />
      </div>

      <div className="w-full max-w-xl text-center z-30 space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
        <div className="space-y-2">
            <h1 className="text-4xl md:text-6xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-cyan-300 dark:to-indigo-400">
                Sahayak AI
            </h1>
            <p className="text-xs font-black text-white/30 uppercase tracking-[0.4em]">A Neural Creation • By Kunj</p>
        </div>

        {step === 'name' ? (
          <form onSubmit={handleNameSubmit} className="relative max-w-md mx-auto space-y-6">
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-white/90">Hello! What should Sahayak call you?</h2>
              <div className="space-y-2 text-left">
                  <label className="px-5 text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Enter Your Name</label>
                  <input 
                      type="text" 
                      autoFocus
                      value={name}
                      onChange={(e) => { setName(e.target.value); setRobotState('typing'); }}
                      placeholder="Enter Your Name"
                      className="w-full px-8 py-5 rounded-[2rem] bg-white/5 border-2 border-white/10 text-lg font-bold text-white outline-none focus:border-blue-500 transition-all shadow-xl"
                  />
              </div>
            </div>
            {error && <p className="text-red-500 text-[10px] font-black uppercase tracking-widest animate-shake">⚠️ {error}</p>}
            <button 
                type="submit"
                className="w-full py-6 rounded-[2.5rem] bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black uppercase tracking-[0.3em] text-sm shadow-2xl hover:scale-[1.02] active:scale-95 transition-all"
            >
                Continue 🚀
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="relative max-w-md mx-auto space-y-6">
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-white/90">Welcome, {name}!</h2>
              <p className="text-white/50 text-sm">To enable high-quality voice and bilingual chat, Sahayak needs a Paid API Key.</p>
              
              <div className="space-y-2 text-left">
                  <label className="px-5 text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Gemini API Key</label>
                  <div className="flex gap-2">
                      <input 
                          type="password" 
                          autoFocus
                          value={apiKey}
                          onChange={(e) => { setApiKey(e.target.value); setRobotState('typing'); }}
                          placeholder="Paste key here..."
                          className="flex-1 px-8 py-5 rounded-[2rem] bg-white/5 border-2 border-white/10 text-sm font-bold text-white outline-none focus:border-blue-500 transition-all shadow-xl"
                      />
                      {window.aistudio && (
                        <button 
                          type="button" 
                          onClick={handleSelectKey}
                          className="px-6 rounded-[2rem] bg-white/10 border-2 border-white/10 hover:bg-white/20 transition-all text-xl"
                          title="Select key from project"
                        >
                          🔑
                        </button>
                      )}
                  </div>
              </div>
            </div>
            
            <button 
                type="submit"
                disabled={isLoading}
                className="w-full py-6 rounded-[2.5rem] bg-gradient-to-r from-teal-600 to-blue-600 text-white font-black uppercase tracking-[0.3em] text-sm shadow-2xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
            >
                {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                    <>
                        <span>Establish Link</span>
                        <span>✨</span>
                    </>
                )}
            </button>
            <button type="button" onClick={() => setStep('name')} className="text-white/30 text-[9px] font-bold uppercase tracking-widest hover:text-white transition-colors">Change Name</button>
          </form>
        )}

        <div className="pt-8 border-t border-white/5 max-w-sm mx-auto">
            <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.5em] leading-relaxed">
                Sahayak • Created by Kunj • Bilingual Intelligence
                <br/>
                <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="text-blue-500/50 hover:underline mt-2 inline-block">Paid Tier Required for Voice Mode</a>
            </p>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
