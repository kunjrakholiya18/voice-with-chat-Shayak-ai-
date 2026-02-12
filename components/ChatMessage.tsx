
import React from 'react';
import { Message } from '../types';

interface ChatMessageProps {
  message: Message;
  theme?: 'light' | 'dark';
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, theme = 'dark' }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div 
        className={`max-w-[85%] md:max-w-[70%] p-5 rounded-[2rem] shadow-[0_10px_30px_rgba(0,0,0,0.1)] transition-all duration-300 ${
          isUser 
          ? 'bg-gradient-to-br from-blue-600 to-indigo-700 border border-white/20 text-white rounded-tr-none' 
          : 'bg-white/60 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-100 rounded-tl-none glass-card'
        }`}
      >
        <div className={`text-[10px] font-black uppercase tracking-widest mb-2 flex items-center gap-2 ${isUser ? 'text-blue-100' : 'text-slate-400 dark:text-teal-400'}`}>
          {isUser ? 'User Node' : 'Assistant Node'}
          <span className="opacity-40 font-normal">
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        
        {message.image && (
          <div className="mb-4 overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 shadow-lg">
            <img 
              src={message.image} 
              alt="Shared content" 
              className="w-full h-auto max-h-96 object-cover hover:scale-105 transition-transform duration-500"
            />
          </div>
        )}

        <div className="whitespace-pre-wrap leading-relaxed text-[15px] font-medium">
          {message.content}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
