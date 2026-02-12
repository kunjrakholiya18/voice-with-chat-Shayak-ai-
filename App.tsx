
import React, { useState, useRef, useEffect } from 'react';
import { Message } from './types';
import { generateBilingualResponse, generateAIImage, setManualApiKey } from './services/geminiService';
import ChatMessage from './components/ChatMessage';
import RobotAvatar from './components/RobotAvatar';
import AuthScreen from './components/AuthScreen';
import LiveMode from './components/LiveMode';
import FloatingAssistant, { CompanionType } from './components/FloatingAssistant';
import MagicImageMode from './components/MagicImageMode';

interface UserProfile {
  name: string;
}

interface CompanionInstance {
  id: string;
  type: CompanionType;
}

type AppView = 'chat' | 'magic';
type ThemeMode = 'light' | 'dark';

const App: React.FC = () => {
  // Always start at the auth screen on app load (do not auto-login from localStorage)
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  const [theme, setTheme] = useState<ThemeMode>(() => {
    const savedTheme = localStorage.getItem('sahayak_theme') as ThemeMode;
    return savedTheme || 'dark';
  });

  const [view, setView] = useState<AppView>('chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [selectedImage, setSelectedImage] = useState<{ data: string, mimeType: string } | null>(null);
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isLiveMode, setIsLiveMode] = useState<boolean>(false);
  
  const [activeCompanions, setActiveCompanions] = useState<CompanionInstance[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync theme with document class
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
    localStorage.setItem('sahayak_theme', theme);
  }, [theme]);

  useEffect(() => {
    if (view === 'chat' && scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, isThinking, view]);

  // Initial welcome message for returning users
  useEffect(() => {
    if (currentUser && messages.length === 0) {
        setMessages([{
            id: 'welcome-' + Date.now(),
            role: 'assistant',
            content: `नमस्ते ${currentUser.name}! मैं सहायक हूँ, और मुझे कुंज (Kunj) ने बनाया है।
मैं आपकी हिंदी और अंग्रेजी दोनों में मदद कर सकता हूँ।

Hello ${currentUser.name}! I am Sahayak, and I am made by Kunj.
I can help you in both Hindi and English.`,
            timestamp: new Date()
        }]);
    }
  }, [currentUser]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const handleAuthSuccess = (name: string, apiKey: string) => {
    setManualApiKey(apiKey);
    const newUser = { name };
    setCurrentUser(newUser);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('sahayak_user');
    localStorage.removeItem('sahayak_api_key');
    setMessages([]);
    setView('chat');
  };

  const addCompanion = (type: CompanionType) => {
    const newCompanion: CompanionInstance = {
      id: Math.random().toString(36).substr(2, 9),
      type
    };
    setActiveCompanions(prev => [...prev, newCompanion].slice(-3));
  };

  const removeCompanion = (id: string) => {
    setActiveCompanions(prev => prev.filter(c => c.id !== id));
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    const trimmedInput = inputText.trim();
    if ((!trimmedInput && !selectedImage) || isThinking) return;

    setErrorMessage(null);
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: trimmedInput,
      image: selectedImage ? `data:${selectedImage.mimeType};base64,${selectedImage.data}` : undefined,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    const currentImg = selectedImage;
    setSelectedImage(null);
    setIsThinking(true);

    try {
      const isImgReq = ['generate', 'create', 'image', 'photo', 'banao', 'chitra', 'make'].some(k => trimmedInput.toLowerCase().includes(k));

      if (isImgReq && !currentImg) {
        const url = await generateAIImage(trimmedInput);
        if (url) {
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'assistant',
            content: `यह रहा आपका चित्र, ${currentUser.name}! 
Here is your image, ${currentUser.name}!`,
            image: url,
            timestamp: new Date()
          }]);
        } else {
          throw new Error("I couldn't generate the image.");
        }
      } else {
        const apiHistory = messages.map(m => ({ 
          role: (m.role === 'user' ? 'user' : 'model') as 'user' | 'model', 
          parts: [{ text: m.content }] 
        })).slice(-10);
        
        const response = await generateBilingualResponse(currentUser.name, trimmedInput, apiHistory, currentImg || undefined);
        setMessages(prev => [...prev, { 
          id: Date.now().toString(), 
          role: 'assistant', 
          content: response.text, 
          timestamp: new Date() 
        }]);
      }
    } catch (error: any) {
      console.error("Neural Error:", error);
      setErrorMessage(error.message || "Link unstable. Please retry.");
    } finally {
      setIsThinking(false);
    }
  };

  if (!currentUser) return <AuthScreen onSuccess={handleAuthSuccess} theme={theme} />;

  return (
    <div className={`h-screen w-screen flex ${theme === 'dark' ? 'bg-[#020617] text-white' : 'bg-slate-50 text-slate-900'} transition-colors duration-500 overflow-hidden relative`}>
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          <div className={`absolute inset-0 bg-dots ${theme === 'dark' ? 'opacity-[0.05] text-white' : 'opacity-[0.1] text-slate-400'}`}></div>
          <div className={`absolute top-[-10%] left-[-10%] w-[50%] h-[50%] ${theme === 'dark' ? 'bg-blue-600/10' : 'bg-blue-400/5'} blur-[150px] animate-pulse-slow`}></div>
          <div className={`absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] ${theme === 'dark' ? 'bg-teal-600/10' : 'bg-teal-400/5'} blur-[120px] animate-float-slow`}></div>
          <div className={`absolute top-[30%] right-[10%] w-[30%] h-[30%] ${theme === 'dark' ? 'bg-purple-600/5' : 'bg-purple-400/3'} blur-[100px] animate-pulse-slow delay-1000`}></div>
      </div>

      {isLiveMode && <LiveMode userName={currentUser.name} voiceName="Kore" theme={theme} onClose={() => setIsLiveMode(false)} />}
      
      {activeCompanions.map((comp, index) => (
        <FloatingAssistant 
          key={comp.id}
          type={comp.type}
          isThinking={isThinking} 
          userName={currentUser.name} 
          theme={theme} 
          initialOffset={{ x: index * -80, y: index * -60 }}
          onClose={() => removeCompanion(comp.id)} 
        />
      ))}

      {/* Sidebar */}
      <div className={`fixed md:relative z-40 h-full w-80 glass-card border-r ${theme === 'dark' ? 'border-white/5 bg-black/20' : 'border-slate-200 bg-white/80'} transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="flex flex-col h-full p-6">
          <div className="flex items-center gap-4 mb-10 group cursor-pointer">
            <div className="relative w-12 h-12 flex items-center justify-center">
              <div className="absolute inset-0 bg-blue-500/30 rounded-2xl blur-md group-hover:scale-125 transition-transform duration-700 animate-pulse"></div>
              <div className="absolute inset-[-4px] border border-dashed border-teal-500/40 rounded-full animate-[spin_10s_linear_infinite] group-hover:border-teal-400"></div>
              <div className="relative z-10 w-full h-full rounded-2xl bg-gradient-to-br from-blue-700 via-blue-600 to-teal-500 flex items-center justify-center text-white font-black text-xl shadow-[0_10px_20px_rgba(37,99,235,0.4)] border border-white/20 transition-all duration-500 group-hover:rotate-[360deg] group-hover:scale-110">
                <span className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">S</span>
                <div className="absolute top-0 left-0 w-full h-1/2 bg-white/20 rounded-t-2xl transform -skew-x-12 -translate-x-1"></div>
              </div>
            </div>
            <div className="flex flex-col">
              <h1 className={`text-xl font-black tracking-tighter transition-colors ${theme === 'dark' ? 'text-white' : 'text-slate-900'} group-hover:text-blue-500`}>Sahayak AI</h1>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse"></div>
                <span className="text-[8px] font-bold text-teal-500 uppercase tracking-[0.2em] -mt-0.5">By Kunj</span>
              </div>
            </div>
          </div>
          
          <div className="space-y-4 mb-6 flex-1 overflow-y-auto pr-2">
            <button 
              onClick={() => { setView('chat'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-4 p-4 rounded-[1.8rem] transition-all duration-300 border hover:scale-[1.05] hover:shadow-[0_0_30px_rgba(37,99,235,0.1)] ${view === 'chat' ? (theme === 'dark' ? 'bg-blue-600/10 border-blue-500/50' : 'bg-blue-50 border-blue-200 shadow-sm') : (theme === 'dark' ? 'bg-transparent border-white/5 hover:border-blue-500/30' : 'bg-transparent border-slate-100 hover:border-blue-200')}`}
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl transition-all duration-300 ${view === 'chat' ? 'bg-blue-600 shadow-lg text-white' : (theme === 'dark' ? 'bg-blue-600/20 text-blue-400' : 'bg-blue-100 text-blue-600')}`}>💬</div>
              <div className="text-left">
                <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${theme === 'dark' ? 'text-blue-400/70' : 'text-blue-600/70'}`}>Interaction</p>
                <p className={`text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>Chat Mode</p>
              </div>
            </button>

            <button 
              onClick={() => { setView('magic'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-4 p-4 rounded-[1.8rem] transition-all duration-300 border hover:scale-[1.05] hover:shadow-[0_0_30px_rgba(147,51,234,0.1)] ${view === 'magic' ? (theme === 'dark' ? 'bg-purple-600/10 border-purple-500/50' : 'bg-purple-50 border-purple-200 shadow-sm') : (theme === 'dark' ? 'bg-transparent border-white/5 hover:border-purple-500/30' : 'bg-transparent border-slate-100 hover:border-purple-200')}`}
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl transition-all duration-300 ${view === 'magic' ? 'bg-purple-600 shadow-lg text-white' : (theme === 'dark' ? 'bg-purple-600/20 text-purple-400' : 'bg-purple-100 text-purple-600')}`}>✨</div>
              <div className="text-left">
                <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${theme === 'dark' ? 'text-purple-400/70' : 'text-purple-600/70'}`}>Creative</p>
                <p className={`text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>Magic Canvas</p>
              </div>
            </button>

            <button
              onClick={() => setIsLiveMode(true)}
              className={`w-full flex items-center gap-4 p-4 rounded-[1.8rem] transition-all duration-300 border ${theme === 'dark' ? 'border-teal-500/20 hover:bg-teal-500/5 hover:border-teal-500/50' : 'border-teal-200 hover:bg-teal-50 hover:border-teal-400'} hover:scale-[1.05]`}
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl transition-all ${theme === 'dark' ? 'bg-teal-500/20 text-teal-400' : 'bg-teal-100 text-teal-600'}`}>🎙️</div>
              <div className="text-left">
                <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${theme === 'dark' ? 'text-teal-400/70' : 'text-teal-600/70'}`}>Real-time</p>
                <p className={`text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>Voice Mode</p>
              </div>
            </button>

            <button
              onClick={() => window.open('https://sahayak-2-0.vercel.app/', '_blank')}
              className={`w-full flex items-center gap-4 p-4 rounded-[1.8rem] transition-all duration-300 border ${theme === 'dark' ? 'border-orange-500/20 hover:bg-orange-500/5 hover:border-orange-500/50' : 'border-orange-200 hover:bg-orange-50 hover:border-orange-400'} hover:scale-[1.05]`}
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl transition-all ${theme === 'dark' ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-100 text-orange-600'}`}>🤖</div>
              <div className="text-left">
                <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${theme === 'dark' ? 'text-orange-400/70' : 'text-orange-600/70'}`}>Next Gen</p>
                <p className={`text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>Sahayak 2.0</p>
              </div>
            </button>
          </div>
          
          <div className="mt-auto pt-6 border-t border-slate-200 dark:border-white/5">
            <div className={`flex items-center gap-3 mb-4 p-4 rounded-[1.5rem] border transition-all ${theme === 'dark' ? 'bg-white/5 border-white/5 hover:border-white/20' : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'}`}>
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">{currentUser.name.charAt(0).toUpperCase()}</div>
              <div className="flex-1 overflow-hidden">
                <p className={`text-sm font-bold truncate ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{currentUser.name}</p>
                <p className="text-[9px] text-teal-500 font-black uppercase tracking-widest">Neural Linked</p>
              </div>
            </div>
            <button onClick={handleLogout} className="w-full py-4 rounded-2xl border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-[0.3em] hover:bg-red-500 hover:text-white transition-all active:scale-95">Disconnect Link</button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative h-full z-10">
        <header className={`h-20 flex items-center justify-between px-6 border-b glass-card ${theme === 'dark' ? 'border-white/5 bg-black/10' : 'border-slate-200 bg-white/60'}`}>
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className={`md:hidden p-2 rounded-lg ${theme === 'dark' ? 'hover:bg-white/5 text-white' : 'hover:bg-slate-200 text-slate-800'}`}><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" /></svg></button>
            <div className="flex flex-col">
              <span className={`text-[10px] font-bold uppercase tracking-[0.2em] ${view === 'magic' ? 'text-purple-500' : 'text-teal-500'}`}>
                Neural Status: Synchronized
              </span>
              <span className={`font-bold text-lg ${theme === 'dark' ? 'text-white/90' : 'text-slate-800'}`}>{view === 'magic' ? 'Magic Canvas' : `Chat as ${currentUser.name}`}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Theme Toggle Button */}
            <button 
              onClick={toggleTheme}
              className={`p-3 rounded-full transition-all duration-300 hover:scale-110 active:scale-90 border flex items-center justify-center ${theme === 'dark' ? 'bg-white/5 border-white/10 text-yellow-400 hover:bg-white/10' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'}`}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? (
                <svg className="w-5 h-5 animate-[spin_10s_linear_infinite]" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" /></svg>
              ) : (
                <svg className="w-5 h-5 -rotate-12" fill="currentColor" viewBox="0 0 20 20"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" /></svg>
              )}
            </button>
            <div className={`hidden sm:block p-3 text-[10px] font-black uppercase tracking-widest border rounded-full px-5 ${theme === 'dark' ? 'text-teal-500/40 border-teal-500/10 bg-teal-500/5' : 'text-teal-600/60 border-teal-600/20 bg-teal-600/5'}`}>Made by Kunj</div>
          </div>
        </header>

        {view === 'magic' ? (
          <MagicImageMode theme={theme} />
        ) : (
          <>
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6">
              {messages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center opacity-30 text-center space-y-6">
                      <div className="relative">
                          <div className={`absolute inset-0 blur-3xl rounded-full scale-150 animate-pulse ${theme === 'dark' ? 'bg-blue-500/20' : 'bg-blue-300/40'}`}></div>
                          <div className="text-8xl relative z-10">🤖</div>
                      </div>
                      <div className="space-y-2">
                        <p className={`font-black uppercase tracking-[0.6em] text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Sahayak AI</p>
                        <p className={`text-[10px] uppercase font-bold tracking-[0.4em] ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Made by Kunj • Intelligence Node</p>
                      </div>
                  </div>
              )}
              {messages.map(msg => <ChatMessage key={msg.id} message={msg} theme={theme} />)}
              {isThinking && (
                  <div className={`flex items-center gap-3 p-4 rounded-[1.2rem] w-fit border animate-pulse ${theme === 'dark' ? 'bg-teal-500/10 border-teal-500/20' : 'bg-teal-50 border-teal-200'}`}>
                    <div className="w-4 h-4 border-2 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" />
                    <span className={`text-[10px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-teal-400' : 'text-teal-600'}`}>Thinking...</span>
                  </div>
              )}
              {errorMessage && (
                <div className="mx-auto max-w-lg p-6 bg-red-500/10 border border-red-500/20 rounded-[1.8rem] text-red-500 text-center space-y-4 animate-shake">
                  <p className="text-xs font-bold font-mono tracking-widest uppercase">⚠️ System Error</p>
                  <p className="text-sm font-medium">{errorMessage}</p>
                  {(errorMessage.toLowerCase().includes("valid api key") || errorMessage.toLowerCase().includes("key")) && (
                    <button 
                      onClick={handleLogout}
                      className="px-6 py-2 bg-red-500 text-white rounded-full text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-transform shadow-lg shadow-red-500/20"
                    >
                      Update API Key
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="p-6">
              <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto relative group">
                <RobotAvatar isThinking={isThinking} theme={theme} />
                <div className={`relative flex items-center border rounded-[2.5rem] p-2 pr-4 transition-all focus-within:ring-2 focus-within:ring-teal-500/50 shadow-2xl glass-card ${theme === 'dark' ? 'bg-black/40 border-white/10' : 'bg-white border-slate-200 shadow-slate-200/50'} ${selectedImage ? 'pt-24' : ''}`}>
                  {selectedImage && (
                      <div className={`absolute top-4 left-4 flex items-center gap-2 p-2 rounded-xl border shadow-md animate-in zoom-in-95 duration-200 backdrop-blur-md ${theme === 'dark' ? 'bg-slate-800/90 border-white/10' : 'bg-slate-50/90 border-slate-200'}`}>
                        <img src={`data:${selectedImage.mimeType};base64,${selectedImage.data}`} className="w-14 h-14 rounded-lg object-cover" alt="Preview"/>
                        <button type="button" onClick={() => setSelectedImage(null)} className="p-1.5 bg-red-500 text-white rounded-full hover:scale-110 transition-all shadow-sm"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                      </div>
                  )}
                  <button type="button" onClick={() => fileInputRef.current?.click()} className={`p-4 transition-colors hover:scale-110 ${theme === 'dark' ? 'text-white/30 hover:text-teal-500' : 'text-slate-400 hover:text-teal-600'}`}><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></button>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={(e) => { const file = e.target.files?.[0]; if (file) { const r = new FileReader(); r.onloadend = () => setSelectedImage({ data: (r.result as string).split(',')[1], mimeType: file.type }); r.readAsDataURL(file); } }} className="hidden"/>
                  <input 
                    value={inputText} 
                    onChange={(e) => setInputText(e.target.value)} 
                    placeholder={`नमस्ते ${currentUser.name}, कुछ पूछें (Hindi/English)...`} 
                    className={`flex-1 bg-transparent border-none focus:ring-0 px-4 py-4 text-lg font-medium outline-none ${theme === 'dark' ? 'placeholder-white/20 text-white' : 'placeholder-slate-300 text-slate-800'}`} 
                  />
                  <button type="submit" disabled={isThinking || (!inputText.trim() && !selectedImage)} className="p-4 bg-gradient-to-br from-blue-600 to-teal-600 hover:from-blue-500 hover:to-teal-500 text-white rounded-full shadow-lg shadow-teal-500/30 transition-all hover:scale-110 active:scale-95 disabled:opacity-50"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg></button>
                </div>
              </form>
              <p className={`text-center text-[9px] mt-6 uppercase tracking-[0.6em] font-black ${theme === 'dark' ? 'text-white/20' : 'text-slate-300'}`}>Made by Kunj • Adaptive AI Assistant</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default App;
