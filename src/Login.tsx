import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './lib/supabase';

export default function Login() {
  const navigate = useNavigate();
  const [showToast, setShowToast] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Show toast on mount for demo purposes
    setShowToast(true);
    const timer = setTimeout(() => setShowToast(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      let authData;
      if (isSignUp) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) throw signUpError;
        authData = data;
        alert('Signup successful! You can now log in.');
        setIsSignUp(false);
        setLoading(false);
        return;
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        authData = data;
      }

      if (authData.user) {
        // Determine role based on specific emails
        let role = 'TM';
        if (email.toLowerCase() === 'rumeshanjanard@gmail.com') {
          role = 'Admin';
        } else if (email.toLowerCase() === 'crishmalf@lionbeer.com') {
          role = 'RSM';
        } else {
          // Check local storage systemUsers as fallback for dynamically added users
          const savedUsers = localStorage.getItem('systemUsers');
          if (savedUsers) {
            const users = JSON.parse(savedUsers);
            const foundUser = users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
            if (foundUser) {
              role = foundUser.role;
            }
          }
        }
        
        // Save user info to localStorage
        localStorage.setItem('currentUser', JSON.stringify({ email, role, id: authData.user.id }));

        // Redirect based on role
        if (role === 'Admin' || role === 'RSM') {
          navigate('/admin-dashboard');
        } else {
          navigate('/tm-dashboard');
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="font-sans bg-[#f8f9fc] min-h-screen flex items-center justify-center p-6 selection:bg-[#2b6bed] selection:text-white relative overflow-hidden">
      {/* Subtle Background Elements for Financial Architect Feel */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-[#2b6bed]/5 blur-[120px]"></div>
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] rounded-full bg-[#2b6bed]/5 blur-[120px]"></div>
      </div>

      {/* Login Card Container */}
      <main className="relative w-full max-w-[440px] z-10">
        {/* Brand Identity Header */}
        <header className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-[20px] bg-gradient-to-br from-indigo-950 via-purple-900 to-indigo-950 mb-6 shadow-xl border border-indigo-800/50">
            <span className="text-transparent bg-clip-text bg-gradient-to-tr from-amber-200 via-fuchsia-400 to-cyan-300 font-black text-4xl italic" style={{ fontFamily: 'serif' }}>S</span>
          </div>
          <h1 className="font-black text-3xl tracking-tight text-slate-800 mb-2">Syntra Luxe</h1>
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">Luxury Brand Stock Tracking</p>
        </header>

        {/* Form Card */}
        <section className="bg-white rounded-[32px] p-8 md:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <form className="space-y-6" onSubmit={handleAuth}>
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-medium text-center">
                {error}
              </div>
            )}
            
            {/* Email Input */}
            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1" htmlFor="email">Work Email</label>
              <div className="relative group">
                <input 
                  className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-slate-800 text-sm font-medium focus:ring-2 focus:ring-[#2b6bed]/20 transition-all placeholder:text-slate-400 outline-none" 
                  id="email" 
                  placeholder="name@company.com" 
                  type="email" 
                  required 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <div className="absolute bottom-0 left-0 w-full h-[2px] bg-[#2b6bed] scale-x-0 group-focus-within:scale-x-100 transition-transform duration-300 origin-left rounded-b-2xl"></div>
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <div className="flex justify-between items-end ml-1">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500" htmlFor="password">Password</label>
                {!isSignUp && <a className="text-[10px] font-bold uppercase tracking-widest text-[#2b6bed] hover:text-[#124bd8] transition-colors" href="#">Forgot Password?</a>}
              </div>
              <div className="relative group">
                <input 
                  className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-slate-800 text-sm font-medium focus:ring-2 focus:ring-[#2b6bed]/20 transition-all placeholder:text-slate-400 outline-none" 
                  id="password" 
                  placeholder="••••••••" 
                  type="password" 
                  required 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <div className="absolute bottom-0 left-0 w-full h-[2px] bg-[#2b6bed] scale-x-0 group-focus-within:scale-x-100 transition-transform duration-300 origin-left rounded-b-2xl"></div>
              </div>
            </div>

            {/* Sign In Action */}
            <button 
              className="w-full bg-[#2b6bed] text-white font-bold py-4 rounded-2xl shadow-lg shadow-[#2b6bed]/20 hover:bg-[#124bd8] active:scale-[0.98] transition-all duration-200 disabled:opacity-70" 
              type="submit"
              disabled={loading}
            >
              {loading ? 'Processing...' : (isSignUp ? 'Create Account' : 'Sign In to Account')}
            </button>

            {/* Alternative Action */}
            <div className="pt-2 text-center">
              <p className="text-slate-500 text-xs font-medium">
                {isSignUp ? 'Already have an account?' : "Don't have an account?"} 
                <button 
                  type="button"
                  onClick={() => { setIsSignUp(!isSignUp); setError(''); }}
                  className="text-[#2b6bed] font-bold hover:underline decoration-2 underline-offset-4 ml-1"
                >
                  {isSignUp ? 'Sign In' : 'Sign Up'}
                </button>
              </p>
            </div>
          </form>
        </section>

        {/* Footer Meta */}
        <footer className="mt-8 text-center">
          <p className="text-[10px] text-slate-400 tracking-widest uppercase font-bold">Version 2.4.0 • Enterprise Secured</p>
        </footer>
      </main>

      {/* Sample Success Toast Notification */}
      {showToast && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[100] w-full max-w-sm px-4">
          <div className="bg-slate-800/95 backdrop-blur-md border border-slate-700 rounded-2xl p-4 shadow-2xl flex items-center gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[#2b6bed]/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-[#2b6bed]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            </div>
            <div className="flex-grow">
              <h4 className="text-white text-sm font-bold">Authentication Ready</h4>
              <p className="text-slate-400 text-xs font-medium mt-0.5">System protocols established. Welcome back.</p>
            </div>
            <button className="text-slate-400 hover:text-white transition-colors" onClick={() => setShowToast(false)}>
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


