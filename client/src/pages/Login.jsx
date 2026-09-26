import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';

import websiteLogo from '../wesbite_image_folder/wesbitelogo.png';

export const Login = () => {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Email address is required');
      return;
    }
    if (!password) {
      setError('Password is required');
      return;
    }

    setLoading(true);
    // Simulate short network delay
    setTimeout(async () => {
      const result = await login(email, password, rememberMe);
      setLoading(false);
      if (result.success) {
        navigate('/dashboard');
      } else {
        setError(result.error || 'Invalid credentials');
      }
    }, 600);
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex flex-col justify-center items-center px-4 py-12">
      {/* Brand Header */}
      <div className="flex flex-col items-center mb-8 text-center">
        <img
          src={websiteLogo}
          alt="Website Logo"
          className="h-16 w-auto object-contain mb-3 drop-shadow-sm"
        />
        <h1 className="text-2xl font-bold text-[#1F2937] tracking-tight">
          AYUSH <span className="text-[#E53935]">HUB</span>
        </h1>
        <p className="text-xs text-gray-500 mt-1">Management System</p>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-md bg-white rounded-2xl border border-[#E5E7EB] shadow-xl p-8">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-[#1F2937]">Admin Sign In</h2>
          <p className="text-xs text-gray-500 mt-1">Enter your credentials to access the management portal</p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-xs text-red-700">
            <ShieldAlert className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email Address"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@example.com"
            icon={Mail}
            required
          />

          <Input
            label="Password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            icon={Lock}
            required
            rightElement={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-gray-400 hover:text-gray-600 focus:outline-none"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            }
          />

          <div className="flex items-center justify-between text-xs pt-1">
            <label className="flex items-center gap-2 text-gray-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded text-[#E53935] focus:ring-[#E53935] border-gray-300 accent-[#E53935]"
              />
              <span>Remember me</span>
            </label>

            <span className="text-gray-400">Demo: admin123</span>
          </div>

          <Button
            type="submit"
            variant="primary"
            fullWidth
            size="md"
            loading={loading}
            className="mt-2"
          >
            Sign In to Portal
          </Button>
        </form>

        {/* Demo Credentials Box */}
        <div className="mt-6 pt-5 border-t border-gray-100 bg-gray-50/70 p-3.5 rounded-lg text-xs text-gray-600 space-y-1">
          <div className="font-semibold text-gray-800 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
            Default Demo Credentials
          </div>
          <div className="flex justify-between text-gray-500 pt-1">
            <span>Email: <strong className="text-gray-700">admin@example.com</strong></span>
            <span>Password: <strong className="text-gray-700">admin123</strong></span>
          </div>
        </div>
      </div>

      <div className="mt-8 text-xs text-gray-400 text-center">
        &copy; {new Date().getFullYear()} Rider Management Portal. All rights reserved.
      </div>
    </div>
  );
};
