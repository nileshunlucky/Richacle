"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      
      if (data.session) {
        await fetch("/add-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email,
        }),
      });

        window.location.href = "/dashboard";
      }
    } catch (err: any) {
      console.error("Login error:", err);
      alert(err.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({ 
        provider: "google", 
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        } 
      });
      if (error) throw error;
      // Supabase will redirect to Google for OAuth
    } catch (err: any) {
      console.error("Google sign-in error:", err);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-purple-200 via-purple-100 to-blue-100 flex flex-col">
      {/* Header */}
      <header className="w-full px-8 py-6 flex items-center justify-between gap-3">
       <Link href="/" >

        <h1 className="text-2xl text-black theseason">RICHACLE</h1>
        
        </Link>
        <div className="text-sm text-gray-700">
          Don't have an account?{" "}
          <Link href="/signup" className="text-gray-800 font-medium hover:underline">
            Sign up →
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 pb-20">
        <div className="w-full max-w-sm">
          <h1 className="text-center text-2xl font-normal text-gray-900 mb-8">
            Log in to your account
          </h1>

          {/* OAuth Buttons */}
          <div className="space-y-3 mb-6">
            <button
              onClick={signInWithGoogle}
              className="w-full flex items-center justify-center gap-3 bg-zinc-900 text-white py-3.5 rounded-full font-medium hover:bg-zinc-800 transition-all shadow-sm"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              LOG IN WITH GOOGLE
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-gray-300"></div>
            <span className="text-gray-500 text-sm">or</span>
            <div className="flex-1 h-px bg-gray-300"></div>
          </div>

          {/* Email Input */}
          <div className="mb-4">
            <div className="flex items-center gap-3 bg-gray-100 rounded-lg px-4 py-3.5 border border-transparent focus-within:border-gray-300 focus-within:bg-white transition-all">
              <Mail size={18} className="text-gray-600" />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent outline-none text-gray-800 placeholder-gray-500"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="mb-3">
            <div className="flex items-center gap-3 bg-gray-100 rounded-lg px-4 py-3.5 border border-transparent focus-within:border-gray-300 focus-within:bg-white transition-all">
              <Lock size={18} className="text-gray-600" />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent outline-none text-gray-800 placeholder-gray-500"
              />
            </div>
          </div>

          {/* Forgot Password Link */}
          <div className="text-center mb-6">
            <a href="/forgot-password" className="text-sm text-blue-600 hover:underline">
              Don't remember your password?
            </a>
          </div>

          {/* Login Button */}
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-black text-white py-3.5 rounded-full font-medium text-base hover:bg-gray-900 transition-all shadow-sm disabled:opacity-50"
          >
            {loading ? "Logging in..." : "Log In"}
          </button>
        </div>
      </div>
    </div>
  );
}