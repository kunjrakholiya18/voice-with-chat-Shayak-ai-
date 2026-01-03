
import React, { useState, useRef, useEffect } from 'react';
import { Message } from './types';
import { generateBilingualResponse, generateAIImage } from './services/geminiService';
import ChatMessage from './components/ChatMessage';
import RobotAvatar from './components/RobotAvatar';
import AuthScreen from './components/AuthScreen';
import LiveMode from './components/LiveMode';
import FloatingAssistant, { CompanionType } from './components/FloatingAssistant';
import MagicImageMode from './components/MagicImageMode';

interface ActiveSession {
  name: string;
  email: string;
}

interface CompanionInstance {
  id: string;
  type: CompanionType;
}

type AppView = 'chat' | 'magic';

const App: React.FC = () => {
  const [activeUsers, setActiveUsers] = useState<ActiveSession[]>(() => {
    const saved = localStorage.getItem('sahayak_active_sessions');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [currentUser, setCurrentUser] = useState<ActiveSession | null>(() => {
    const saved = localStorage.getItem('sahayak_current_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [view, setView] = useState<AppView>('chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [selectedImage, setSelectedImage] = useState<{ data: string, mimeType: string } | null>(null);
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isLiveMode, setIsLiveMode] = useState<boolean>(false);
  
  const [showCompanionPicker, setShowCompanionPicker] = useState<boolean>(false);
  const [activeCompanions, setActiveCompanions] = useState<CompanionInstance[]>([]);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('sahayak-theme') as 'light' | 'dark') || 'dark';
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('sahayak-theme', theme);
    document.body.className = theme;
  }, [theme]);

  useEffect(() => {
    if (view === 'chat' && scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, isThinking, view]);

  const handleAuthSuccess = (name: string, email: string) => {
    const newUser = { name, email };
    setCurrentUser(newUser);
    localStorage.setItem('sahayak_current_user', JSON.stringify(newUser));

    const updatedSessions = [newUser, ...activeUsers.filter(u => u.email !== email)].slice(0, 3);
    setActiveUsers(updatedSessions);
    localStorage.setItem('sahayak_active_sessions', JSON.stringify(updatedSessions));

    setMessages([{
      id: 'welcome-' + Date.now(),
      role: 'assistant',
      content: `Hello ${name}, I am Sahayak! Neural link established.

I can talk with you in English or Hindi. 
- Type/Speak in English -> Response in English.
- Type/Speak in Hindi -> Response in Hindi.`,
      timestamp: new Date()
    }]);
  };

  const handleLogout = (email?: string) => {
    if (email) {
      const updated = activeUsers.filter(u => u.email !== email);
      setActiveUsers(updated);
      localStorage.setItem('sahayak_active_sessions', JSON.stringify(updated));
      if (currentUser?.email === email) {
        const nextUser = updated[0] || null;
        setCurrentUser(nextUser);
        localStorage.setItem('sahayak_current_user', JSON.stringify(nextUser));
      }
    } else {
      setCurrentUser(null);
      localStorage.removeItem('sahayak_current_user');
    }
  };

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const addCompanion = (type: CompanionType) => {
    const newCompanion: CompanionInstance = {
      id: Math.random().toString(36).substr(2, 9),
      type
    };

    setActiveCompanions(prev => {
      // Logic: Max 3 robots. If 4th is added, remove the 1st one (oldest)
      if (prev.length >= 3) {
        return [...prev.slice(1), newCompanion];
      }
      return [...prev, newCompanion];
    });
    setShowCompanionPicker(false);
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
            content: `Here is what I created for you, ${currentUser.name}!`,
            image: url,
            timestamp: new Date()
          }]);
        } else {
          throw new Error("I couldn't generate the image. Please try a different prompt.");
        }
      } else {
        const apiHistory = messages.map(m => ({ role: (m.role === 'user' ? 'user' : 'model') as 'user' | 'model', parts: [{ text: m.content }] })).slice(-8);
        const response = await generateBilingualResponse(currentUser.name, trimmedInput, apiHistory, currentImg || undefined);
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: response.text, timestamp: new Date() }]);
      }
    } catch (error: any) {
      setErrorMessage(error.message || "Something went wrong. Let's try again.");
    } finally {
      setIsThinking(false);
    }
  };

  if (!currentUser) return <AuthScreen onSuccess={handleAuthSuccess} theme={theme} onToggleTheme={toggleTheme} activeUsers={activeUsers} />;

  return (
    <div className={`h-screen w-screen flex bg-white dark:bg-black text-slate-900 dark:text-white transition-colors duration-500 overflow-hidden`}>
      {isLiveMode && <LiveMode userName={currentUser.name} voiceName="Kore" theme={theme} onClose={() => setIsLiveMode(false)} />}
      
      {/* Multiple Floating Robots */}
      {activeCompanions.map((comp, index) => (
        <FloatingAssistant 
          key={comp.id}
          type={comp.type}
          isThinking={isThinking} 
          userName={currentUser.name} 
          theme={theme} 
          // Offset position slightly if multiple robots are spawned
          initialOffset={{ x: index * -80, y: index * -60 }}
          onClose={() => removeCompanion(comp.id)} 
        />
      ))}

      {/* Sidebar */}
      <div className={`fixed md:relative z-40 h-full w-72 glass-card border-r border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="flex flex-col h-full p-6">
          <div className="flex items-center gap-4 mb-8">
            <div className="relative group/logo">
              <div className="absolute -inset-1.5 bg-cyan-500/30 rounded-full blur opacity-50 animate-pulse"></div>
              <div className="w-12 h-12 rounded-full overflow-hidden border border-blue-400/30 relative z-10 bg-slate-900">
                <img 
                  src="https://images.unsplash.com/photo-1675271591211-126ad94e495d?q=80&w=200&auto=format&fit=crop" 
                  className="w-full h-full object-cover" 
                  alt="Sahayak Globe"
                />
              </div>
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl font-black tracking-tight bg-gradient-to-r from-blue-600 via-cyan-500 to-indigo-600 dark:from-blue-400 dark:via-cyan-300 dark:to-indigo-400 bg-clip-text text-transparent">Sahayak AI</h1>
              <span className="text-[8px] font-bold text-blue-500/50 uppercase tracking-[0.3em] -mt-1">Neural Core</span>
            </div>
          </div>
          
          <div className="space-y-3 mb-6">
            <button 
              onClick={() => { setView('chat'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all text-sm font-bold border shadow-sm ${view === 'chat' ? 'bg-blue-600 text-white border-blue-500' : 'bg-white/5 hover:bg-white/10 border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400'}`}
            >
              <div className={`w-2.5 h-2.5 rounded-full ${view === 'chat' ? 'bg-white animate-pulse' : 'bg-blue-500'}`} />
              Chat Assistant
            </button>

            <button 
              onClick={() => { setView('magic'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all text-sm font-bold border shadow-sm ${view === 'magic' ? 'bg-purple-600 text-white border-purple-500' : 'bg-white/5 hover:bg-white/10 border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400'}`}
            >
              <div className={`w-2.5 h-2.5 rounded-full ${view === 'magic' ? 'bg-white animate-pulse' : 'bg-purple-500'}`} />
              Magic Image
            </button>

            <button 
              onClick={() => setIsLiveMode(true)} 
              className="w-full flex items-center gap-3 p-4 rounded-2xl bg-green-600/10 hover:bg-green-600/20 text-green-600 dark:text-green-400 transition-all text-sm font-bold border border-green-600/20 shadow-sm"
            >
              <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
              Voice Mode
            </button>

            <div className="relative">
              <button 
                onClick={() => setShowCompanionPicker(!showCompanionPicker)} 
                className={`w-full flex items-center gap-3 p-4 rounded-2xl bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 transition-all text-sm font-bold border ${showCompanionPicker ? 'border-indigo-500 bg-indigo-600/20' : 'border-indigo-600/20'} shadow-sm`}
              >
                <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
                Companions ({activeCompanions.length}/3)
              </button>
              
              {showCompanionPicker && (
                <div className="absolute top-full left-0 w-full mt-2 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl z-50 flex flex-col gap-2 animate-in slide-in-from-top-4 duration-300">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2 mb-1">Summon Companion</p>
                  {(['aero', 'volt', 'luna'] as CompanionType[]).map(type => (
                    <button 
                      key={type}
                      onClick={() => addCompanion(type)}
                      className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-all group"
                    >
                      <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${type === 'aero' ? 'from-blue-500 to-blue-600' : type === 'volt' ? 'from-green-500 to-emerald-600' : 'from-rose-400 to-purple-500'} group-hover:scale-110 transition-transform`} />
                      <span className="text-xs font-bold capitalize">{type}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex-1 space-y-6 overflow-y-auto pr-2">
             <div className="space-y-3">
                <div className="px-3 text-[10px] font-bold text-slate-400 dark:text-white/20 uppercase tracking-[0.2em]">Connected Links</div>
                <div className="space-y-2">
                  {activeUsers.map((user) => (
                    <div 
                      key={user.email} 
                      onClick={() => handleAuthSuccess(user.name, user.email)}
                      className={`group flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${user.email === currentUser.email ? 'bg-blue-500/10 border-blue-500/30' : 'bg-transparent border-transparent hover:bg-slate-200 dark:hover:bg-white/5'}`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white ${user.email === currentUser.email ? 'bg-blue-600' : 'bg-slate-400 dark:bg-white/20 opacity-60'}`}>
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-bold truncate ${user.email === currentUser.email ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-white/40'}`}>
                          {user.name}
                        </p>
                        <p className="text-[9px] text-green-500 font-bold uppercase tracking-tighter">Synced</p>
                      </div>
                    </div>
                  ))}
                </div>
             </div>
          </div>
          
          <div className="mt-auto pt-6 border-t border-slate-200 dark:border-white/10">
            <div className="flex items-center gap-3 mb-4 p-2 rounded-xl bg-slate-200/50 dark:bg-white/5">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-white shadow-sm">{currentUser.name.charAt(0).toUpperCase()}</div>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-bold truncate">{currentUser.name}</p>
                <p className="text-[10px] text-blue-500 font-black uppercase tracking-widest">Master Link</p>
              </div>
            </div>
            <button onClick={() => handleLogout()} className="w-full py-3 rounded-xl border border-red-500/20 text-red-500 text-sm font-bold hover:bg-red-500 hover:text-white transition-all">Sign Out</button>
          </div>
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col relative h-full">
        <header className="h-20 flex items-center justify-between px-6 border-b border-slate-200 dark:border-white/10 glass-card">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="md:hidden p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" /></svg></button>
            <div className="flex flex-col">
              <span className={`text-[10px] font-bold uppercase tracking-[0.2em] ${view === 'magic' ? 'text-purple-500' : 'text-blue-600 dark:text-blue-400'}`}>
                {view === 'magic' ? 'Nano Banana Engine' : 'Neural Path Active'}
              </span>
              <span className="font-bold text-lg">{view === 'magic' ? 'Magic Canvas' : `${currentUser.name}'s Chat`}</span>
            </div>
          </div>
          <button onClick={toggleTheme} className="p-3 rounded-full bg-slate-100 dark:bg-white/5 hover:scale-110 transition-all border border-slate-200 dark:border-white/10 shadow-sm">{theme === 'dark' ? '☀️' : '🌙'}</button>
        </header>

        {view === 'magic' ? (
          <MagicImageMode theme={theme} />
        ) : (
          <>
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map(msg => <ChatMessage key={msg.id} message={msg} theme={theme} />)}
              {isThinking && <div className="flex items-center gap-4 p-4 animate-pulse"><div className="w-8 h-8 rounded-full border-2 border-blue-500/20 border-t-blue-500 animate-spin" /><span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Sahayak is processing...</span></div>}
              {errorMessage && <div className="mx-auto max-w-lg p-5 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-center text-sm font-bold animate-shake">⚠️ {errorMessage}</div>}
            </div>

            <div className="p-6">
              <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto relative group">
                <RobotAvatar isThinking={isThinking} theme={theme} />
                <div className={`relative flex items-center bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-[2rem] p-2 pr-4 transition-all focus-within:ring-2 focus-within:ring-blue-500/50 shadow-2xl ${selectedImage ? 'pt-24' : ''}`}>
                  {selectedImage && <div className="absolute top-4 left-4 flex items-center gap-2 bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-white/10 shadow-md animate-in zoom-in-95 duration-200"><img src={`data:${selectedImage.mimeType};base64,${selectedImage.data}`} className="w-14 h-14 rounded-lg object-cover" alt="Preview"/><button type="button" onClick={() => setSelectedImage(null)} className="p-1.5 bg-red-500 text-white rounded-full hover:scale-110 transition-all shadow-sm"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button></div>}
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="p-3 text-slate-400 dark:text-white/30 hover:text-blue-500 transition-colors"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></button>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={(e) => { const file = e.target.files?.[0]; if (file) { const r = new FileReader(); r.onloadend = () => setSelectedImage({ data: (r.result as string).split(',')[1], mimeType: file.type }); r.readAsDataURL(file); } }} className="hidden"/>
                  <input value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder={`Hi ${currentUser.name}, speak in Hindi or English...`} className="flex-1 bg-transparent border-none focus:ring-0 px-4 py-3 text-base placeholder-slate-400 dark:placeholder-white/20" />
                  <button type="submit" disabled={isThinking || (!inputText.trim() && !selectedImage)} className="p-4 bg-blue-600 hover:bg-blue-500 text-white rounded-full shadow-lg shadow-blue-500/40 transition-all active:scale-95 disabled:opacity-50"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg></button>
                </div>
              </form>
              <p className="text-center text-[9px] text-slate-400 dark:text-white/20 mt-4 uppercase tracking-[0.4em] font-bold">Sahayak Global Network • Secure Switching</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default App;
