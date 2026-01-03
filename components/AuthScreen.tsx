
import React, { useState, useEffect } from 'react';
import AuthRobot, { RobotState } from './AuthRobot';
import Orb from './Orb';

interface ActiveSession {
  name: string;
  email: string;
}

interface AuthScreenProps {
  onSuccess: (name: string, email: string) => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
  activeUsers?: ActiveSession[];
}

type AuthView = 'login' | 'signup' | 'changePassword' | 'forgotEmail' | 'verifyOtp' | 'resetPassword';

const AuthScreen: React.FC<AuthScreenProps> = ({ onSuccess, theme = 'dark', onToggleTheme, activeUsers = [] }) => {
  const [view, setView] = useState<AuthView>('login');
  const [showProfilePicker, setShowProfilePicker] = useState(activeUsers.length > 0);
  const [robotState, setRobotState] = useState<RobotState>('waving');
  const [formData, setFormData] = useState({ 
    email: '', 
    password: '', 
    name: '',
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
    otp: ''
  });
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setRobotState('idle'), 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setRobotState('typing');
    setError('');
    setSuccessMsg('');
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (view === 'signup') {
      if (!formData.email || !formData.password || !formData.name) {
        setRobotState('denying');
        setError('All fields are required!');
        setIsLoading(false);
        return;
      }
      const existingUser = localStorage.getItem(`user_${formData.email}`);
      if (existingUser) {
        setRobotState('denying');
        setError('Email already exists!');
        setIsLoading(false);
        return;
      }
      localStorage.setItem(`user_${formData.email}`, JSON.stringify({
        name: formData.name, email: formData.email, password: formData.password
      }));
      setRobotState('cheering');
      setTimeout(() => onSuccess(formData.name, formData.email), 1500);
    } else if (view === 'login') {
      const savedData = localStorage.getItem(`user_${formData.email}`);
      if (savedData) {
        const user = JSON.parse(savedData);
        if (user.password === formData.password) {
          setRobotState('cheering');
          setTimeout(() => onSuccess(user.name, user.email), 1500);
        } else {
          setRobotState('denying');
          setError('Incorrect password!');
          setIsLoading(false);
        }
      } else {
        setRobotState('denying');
        setError('No account found!');
        setIsLoading(false);
      }
    }
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const savedData = localStorage.getItem(`user_${formData.email}`);
    if (!savedData) {
      setError("Please login first or enter valid email.");
      setRobotState('denying');
      return;
    }
    const user = JSON.parse(savedData);
    if (user.password !== formData.oldPassword) {
      setError("Old password is incorrect!");
      setRobotState('denying');
      return;
    }
    if (formData.newPassword !== formData.confirmPassword) {
      setError("New passwords do not match!");
      setRobotState('denying');
      return;
    }
    user.password = formData.newPassword;
    localStorage.setItem(`user_${formData.email}`, JSON.stringify(user));
    setRobotState('cheering');
    setSuccessMsg("Password changed successfully!");
    setTimeout(() => setView('login'), 2000);
  };

  const handleForgotEmail = (e: React.FormEvent) => {
    e.preventDefault();
    const savedData = localStorage.getItem(`user_${formData.email}`);
    if (!savedData) {
      setError("Email not registered!");
      setRobotState('denying');
      return;
    }
    setSuccessMsg("OTP successfully sent to your email!");
    setRobotState('cheering');
    setTimeout(() => setView('verifyOtp'), 1500);
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.otp) {
      setError("Please enter OTP");
      return;
    }
    setRobotState('cheering');
    setView('resetPassword');
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.newPassword !== formData.confirmPassword) {
      setError("Passwords do not match!");
      return;
    }
    const savedData = localStorage.getItem(`user_${formData.email}`);
    if (savedData) {
      const user = JSON.parse(savedData);
      user.password = formData.newPassword;
      localStorage.setItem(`user_${formData.email}`, JSON.stringify(user));
      setSuccessMsg("Password reset successfully!");
      setRobotState('cheering');
      setTimeout(() => setView('login'), 2000);
    }
  };

  const handleQuickLogin = (user: ActiveSession) => {
    setRobotState('cheering');
    setIsLoading(true);
    setTimeout(() => onSuccess(user.name, user.email), 1000);
  };

  return (
    <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-black overflow-hidden relative px-6 py-12 transition-colors duration-500">
      <button 
        onClick={onToggleTheme} 
        className="absolute top-8 right-8 p-3 rounded-full bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-white/60 hover:bg-slate-300 dark:hover:bg-white/20 transition-all z-50 shadow-sm"
      >
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>

      <div className="absolute top-1/4 -left-20 opacity-50"><Orb size="md" theme={theme} /></div>
      <div className="absolute bottom-1/4 -right-20 opacity-50"><Orb size="sm" theme={theme} /></div>
      
      <div className="mb-8 z-20"><AuthRobot state={robotState} /></div>

      <div className={`w-full max-w-md bg-white dark:bg-black/40 glass-card p-8 rounded-[2.5rem] shadow-2xl z-30 border border-slate-200 dark:border-white/10 transition-all duration-500 ${isLoading ? 'scale-95 opacity-50' : 'scale-100'}`}>
        {showProfilePicker ? (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-3xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Who is using Sahayak?</h2>
              <p className="text-slate-400 dark:text-white/30 text-xs mt-2 font-bold uppercase tracking-widest">Active Neural Links Detected</p>
            </div>
            <div className="space-y-3">
              {activeUsers.map((user) => (
                <button 
                  key={user.email} 
                  onClick={() => handleQuickLogin(user)}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-blue-500 hover:scale-[1.02] transition-all group"
                >
                  <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-lg shadow-lg">{user.name.charAt(0).toUpperCase()}</div>
                  <div className="text-left flex-1">
                    <p className="font-bold text-slate-900 dark:text-white">{user.name}</p>
                    <p className="text-[10px] text-slate-400 dark:text-white/30 font-bold uppercase tracking-tighter">{user.email}</p>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                </button>
              ))}
              <button onClick={() => setShowProfilePicker(false)} className="w-full py-4 rounded-2xl border-2 border-dashed border-slate-200 dark:border-white/10 text-slate-400 dark:text-white/30 font-bold text-sm hover:border-blue-500 hover:text-blue-500 transition-all">+ Add Another Account</button>
            </div>
          </div>
        ) : (
          <>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                {view === 'login' && 'Neural Link Login'}
                {view === 'signup' && 'Register Link'}
                {view === 'changePassword' && 'Change Password'}
                {view === 'forgotEmail' && 'Recover Account'}
                {view === 'verifyOtp' && 'OTP Verification'}
                {view === 'resetPassword' && 'Reset Secure Key'}
              </h2>
              {successMsg && <p className="text-green-500 text-[10px] font-black uppercase tracking-widest mt-2 animate-bounce">{successMsg}</p>}
              {error && <p className="text-red-500 text-[10px] font-black uppercase tracking-widest mt-2 animate-shake">{error}</p>}
            </div>

            {/* Login / Signup Form */}
            {(view === 'login' || view === 'signup') && (
              <form onSubmit={handleAuthSubmit} className="space-y-4">
                {view === 'signup' && (
                  <input type="text" name="name" value={formData.name} onChange={handleInputChange} placeholder="Full Name" className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/50" />
                )}
                <input type="email" name="email" value={formData.email} onChange={handleInputChange} placeholder="Email Address" className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/50" />
                <input type="password" name="password" value={formData.password} onChange={handleInputChange} placeholder="Secure Key" className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/50" />
                <button type="submit" disabled={isLoading} className="w-full py-4 mt-2 rounded-2xl bg-blue-600 font-black text-white shadow-xl hover:bg-blue-500 transition-all active:scale-95 disabled:opacity-50 uppercase text-xs tracking-widest">
                  {isLoading ? 'Connecting...' : (view === 'login' ? 'Establish Link' : 'Register New')}
                </button>
                {view === 'login' && (
                  <div className="flex justify-between px-2">
                    <button type="button" onClick={() => setView('changePassword')} className="text-[10px] font-bold text-slate-400 hover:text-blue-500">Change Password?</button>
                    <button type="button" onClick={() => setView('forgotEmail')} className="text-[10px] font-bold text-slate-400 hover:text-blue-500">Forgot Password?</button>
                  </div>
                )}
              </form>
            )}

            {/* Change Password Form */}
            {view === 'changePassword' && (
              <form onSubmit={handleChangePassword} className="space-y-4">
                <input type="email" name="email" value={formData.email} onChange={handleInputChange} placeholder="Registered Email" className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white" />
                <input type="password" name="oldPassword" value={formData.oldPassword} onChange={handleInputChange} placeholder="Old Password" className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white" />
                <input type="password" name="newPassword" value={formData.newPassword} onChange={handleInputChange} placeholder="New Password" className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white" />
                <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleInputChange} placeholder="Confirm New Password" className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white" />
                <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs tracking-widest uppercase shadow-lg">Update Key</button>
                <div className="text-center">
                  <button type="button" onClick={() => setView('forgotEmail')} className="text-[10px] font-bold text-indigo-500 underline">Forget Password?</button>
                </div>
              </form>
            )}

            {/* Forgot Email Step */}
            {view === 'forgotEmail' && (
              <form onSubmit={handleForgotEmail} className="space-y-4">
                <p className="text-[10px] text-slate-400 text-center uppercase font-bold tracking-widest">Enter registered email to receive OTP</p>
                <input type="email" name="email" value={formData.email} onChange={handleInputChange} placeholder="Email Address" className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white" />
                <button type="submit" className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-xs tracking-widest uppercase">Send OTP</button>
              </form>
            )}

            {/* Verify OTP Step */}
            {view === 'verifyOtp' && (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <p className="text-[10px] text-slate-400 text-center uppercase font-bold tracking-widest">Enter OTP sent to {formData.email}</p>
                <input type="text" name="otp" value={formData.otp} onChange={handleInputChange} placeholder="Enter OTP (Any)" className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-center tracking-[1em] font-black" />
                <button type="submit" className="w-full py-4 bg-green-600 text-white rounded-2xl font-black text-xs tracking-widest uppercase">Verify OTP</button>
              </form>
            )}

            {/* Reset Password Form */}
            {view === 'resetPassword' && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <input type="password" name="newPassword" value={formData.newPassword} onChange={handleInputChange} placeholder="Set New Password" className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white" />
                <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleInputChange} placeholder="Confirm New Password" className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white" />
                <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs tracking-widest uppercase">Reset Password</button>
              </form>
            )}

            <div className="mt-6 text-center space-y-3">
              <button
                onClick={() => { setView(view === 'login' ? 'signup' : 'login'); setError(''); setRobotState('waving'); }}
                className="text-slate-500 dark:text-white/40 text-[10px] font-black uppercase tracking-widest hover:text-blue-600 dark:hover:text-white transition-colors"
              >
                {view === 'login' ? "New User? Register Link" : (view === 'signup' ? 'Back to Login' : '')}
              </button>
              {(view !== 'login' && view !== 'signup') && (
                <button onClick={() => { setView('login'); setError(''); }} className="block w-full text-slate-400 text-[10px] font-black uppercase tracking-widest hover:text-blue-500 transition-all">Cancel & Return</button>
              )}
              {activeUsers.length > 0 && (
                <div>
                  <button onClick={() => setShowProfilePicker(true)} className="text-blue-500 text-[10px] font-black uppercase tracking-tighter hover:underline">
                    Back to Profile Picker
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthScreen;
