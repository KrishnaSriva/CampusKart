import React, { useState, useContext, useEffect } from 'react';
import axios from 'axios';
import api from '../api/axiosInstance';
import { AuthContext } from '../context/AuthContext';
import { Mail, Lock, ShieldCheck, User } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

const Login = () => {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Parse mode from URL query e.g., ?mode=signup
  const queryParams = new URLSearchParams(location.search);
  const mode = queryParams.get('mode');
  
  const [isLogin, setIsLogin] = useState(mode !== 'signup');
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [showResetOtp, setShowResetOtp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Re-adjust mode synchronously if user quickly clicks header links
  useEffect(() => {
    setIsLogin(mode !== 'signup');
    setIsForgotPassword(false);
    setShowResetOtp(false);
    setError('');
    setMessage('');
  }, [mode]);
  const [message, setMessage] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    otp: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (isForgotPassword) {
        // Request Reset OTP
        const { data } = await api.post('/auth/forgot-password', {
          email: formData.email
        });
        setMessage(data.message);
        setShowResetOtp(true);
      } else if (isLogin) {
        // Traditional Login
        const { data } = await api.post('/auth/login', {
          email: formData.email,
          password: formData.password
        });
        login(data.data);
        if (data.data.user?.role === 'admin') navigate('/admin');
        else navigate('/');
      } else {
        // Register & Send OTP
        const { data } = await api.post('/auth/register', {
          name: formData.name,
          email: formData.email,
          password: formData.password
        });
        setMessage(data.message);
        setShowOtp(true);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const { data } = await api.post('/auth/resend-otp', {
        email: formData.email,
      });
      setMessage(data.message);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend OTP.');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isForgotPassword && showResetOtp) {
        const { data } = await api.post('/auth/reset-password', {
          email: formData.email,
          otp: formData.otp,
          newPassword: formData.password
        });
        setMessage(data.message);
        setIsForgotPassword(false);
        setShowResetOtp(false);
        setIsLogin(true); // Bring them efficiently back to login
      } else {
        const { data } = await api.post('/auth/verify-otp', {
          email: formData.email,
          otp: formData.otp
        });
        login(data.data);
        if (data.data.user?.role === 'admin') navigate('/admin');
        else navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid Request / OTP.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex w-full min-h-[85vh] items-center justify-center p-4">
      <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 bg-transparent rounded-[2rem] overflow-hidden min-h-[600px] shadow-2xl relative">
        
        {/* Left Side: Form Area exactly mirroring the image */}
        <div className="flex flex-col justify-center p-8 md:p-16 relative z-10 w-full animate-fade-in order-2 md:order-1">
          <h2 className="text-4xl font-extrabold mb-2 tracking-tight">
            {showOtp ? 'Verify OTP' : isForgotPassword && !showResetOtp ? 'Reset Password' : isForgotPassword && showResetOtp ? 'Change Password' : isLogin ? 'Welcome back' : 'Join Campus Kart'}
          </h2>
          <p className="text-gray-200 text-sm mb-10 opacity-90">
            {showOtp ? 'Check your IITP Email' : isLogin ? 'Please Enter your Account details' : 'Register to easily buy and sell products'}
          </p>

          {error && <div className="bg-red-500 bg-opacity-20 border border-red-500 text-red-200 p-3 rounded-lg mb-4 text-sm font-medium backdrop-blur-sm shadow">{error}</div>}
          {message && <div className="bg-green-500 bg-opacity-20 border border-green-500 text-green-200 p-3 rounded-lg mb-4 text-sm font-medium backdrop-blur-sm shadow">{message}</div>}

          {!showOtp && !showResetOtp && (
            <form onSubmit={handleAuth} className="space-y-6 w-full max-w-sm">
              {!isLogin && !isForgotPassword && (
                <div>
                  <label className="block text-sm text-gray-200 mb-2 ml-4">Full Name</label>
                  <input type="text" name="name" required value={formData.name} onChange={handleChange} className="glass-input" />
                </div>
              )}
              
              <div>
                <label className="block text-sm text-gray-200 mb-2 ml-4">Email</label>
                <input type="email" name="email" placeholder="johndoe@iitp.ac.in" required value={formData.email} onChange={handleChange} className="glass-input bg-[#111] border-none shadow-[0_4px_10px_rgba(0,0,0,0.5)]" />
              </div>

              {(!isForgotPassword || (isForgotPassword && showResetOtp)) && (
                <div>
                  <label className="block text-sm text-gray-200 mb-2 ml-4">Password</label>
                  <input type="password" name="password" placeholder="•••••••••" required value={formData.password} onChange={handleChange} className="glass-input bg-[#111] border-none shadow-[0_4px_10px_rgba(0,0,0,0.5)] text-xl tracking-widest" />
                </div>
              )}

              {isLogin && !isForgotPassword && (
                <div className="flex justify-between items-center px-4 mt-2">
                  <label className="flex items-center text-xs text-teal-100 gap-2 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 rounded-full bg-[#030a0d] border-none accent-teal-400" defaultChecked /> Keep me logged in
                  </label>
                  <button type="button" onClick={() => { setIsForgotPassword(!isForgotPassword); setError(''); setMessage(''); }} className="text-xs text-teal-300 hover:text-white transition underline underline-offset-2">
                    Forgot Password
                  </button>
                </div>
              )}

              <button type="submit" disabled={loading} className="glass-button text-lg mt-8">
                {loading ? 'Processing...' : isForgotPassword ? 'Send Reset OTP' : isLogin ? 'Sign in' : 'Create Account'}
              </button>

              <div className="text-center mt-6">
                 {isForgotPassword ? (
                   <button type="button" onClick={() => { setIsLogin(true); setIsForgotPassword(false); setError(''); }} className="text-sm text-teal-400 hover:underline font-medium">Return to Login</button>
                 ) : (
                   <p className="text-sm text-teal-200">
                     {isLogin ? "Don't have an account?" : 'Already a member?'}
                     <button type="button" onClick={() => { setIsLogin(!isLogin); setError(''); }} className="ml-2 font-bold text-teal-50 hover:text-teal-300 transition">
                       {isLogin ? 'Sign Up here' : 'Login instead'}
                     </button>
                   </p>
                 )}
              </div>
            </form>
          )}

          {/* OTP Verification Forms mapped onto exact layout */}
          {(showOtp || showResetOtp) && (
            <form onSubmit={verifyOtp} className="space-y-6 w-full max-w-sm">
              <div>
                <label className="block text-sm text-gray-200 mb-2 ml-4">6-Digit OTP</label>
                <input type="text" name="otp" placeholder="•• •• ••" required value={formData.otp} onChange={handleChange} className="glass-input bg-[#111] border-none shadow-[0_4px_10px_rgba(0,0,0,0.5)] text-xl tracking-[0.5em] text-center" />
              </div>
              
              {showResetOtp && (
                <div>
                  <label className="block text-sm text-gray-200 mb-2 ml-4">New Password</label>
                  <input type="password" name="password" placeholder="•••••••••" required value={formData.password} onChange={handleChange} className="glass-input bg-[#111] border-none shadow-[0_4px_10px_rgba(0,0,0,0.5)] text-xl tracking-widest" />
                </div>
              )}
              
              <button type="submit" disabled={loading} className="glass-button text-lg mt-8">
                {loading ? 'Verifying...' : showResetOtp ? 'Change Password' : 'Verify & Login'}
              </button>
              
              {!showResetOtp && (
                <button type="button" onClick={handleResend} disabled={loading} className="w-full text-sm text-gray-300 mt-4 hover:text-white underline">
                  Didn't receive it? Resend OTP
                </button>
              )}
            </form>
          )}
        </div>

        {/* Right Side: Showcase / Testimonial precisely mimicking the graphic */}
        <div className="bg-[#030a0d]/95 p-12 md:p-20 flex flex-col justify-center rounded-3xl md:rounded-tl-[3rem] md:rounded-bl-[3rem] shadow-[-10px_0_30px_rgba(0,0,0,0.6)] order-1 md:order-2 border-l border-teal-900/30 relative overflow-hidden">
          
          {/* Aesthetic Starburst shape purely decorative */}
          <div className="absolute -bottom-16 -right-16 text-teal-800 opacity-20 select-none pointer-events-none">
             <svg width="400" height="400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.5"><path d="M12 2v20M2 12h20M4.9 4.9l14.2 14.2M4.9 19.1l14.2-14.2M8.5 2.5l7 19M2.5 8.5l19 7M2.5 15.5l19-7M15.5 2.5l-7 19"/></svg>
          </div>

          <h2 className="text-4xl md:text-5xl font-bold text-teal-50 mb-12 leading-tight drop-shadow-[0_0_15px_rgba(0,210,255,0.4)]">
            What's our <br />
            Students Said.
          </h2>
          
          <div className="text-teal-400 text-6xl font-serif mb-4 leading-none select-none">“</div>
          <p className="text-teal-100 text-lg md:text-xl leading-relaxed mb-10 italic border-l-2 border-teal-500 pl-6">
            "Searching and finding your campus necessities is now easier than ever. 
            Just browse a product and bid if you need to."
          </p>

          <div>
             <h4 className="text-teal-200 font-bold text-xl mb-1">Campus Senior</h4>
             <p className="text-teal-600 text-sm">Graduating Class at IITP</p>
          </div>

          <div className="flex gap-4 mt-12">
            <button className="w-12 h-12 rounded-xl bg-teal-500/20 text-teal-300 hover:text-white border border-teal-500/40 flex items-center justify-center shadow-md hover:bg-teal-500/40 transition hover:-translate-y-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            </button>
            <button className="w-12 h-12 rounded-xl bg-teal-500 text-[#030a0d] hover:bg-teal-400 flex items-center justify-center shadow-[0_0_15px_rgba(0,210,255,0.3)] transition hover:-translate-y-1 font-bold">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Login;
