"use client";

import { useState } from "react";
import { Mail, Check } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import Link from 'next/link';


export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
      alert("Check your email for the magic link!");
      // User will be redirected after clicking email link
    } catch (err: any) {
      console.error("Signup error:", err);
      alert(err.message || "Signup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const signUpWithGoogle = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({ 
        provider: "google", 
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        } 
      });
      if (error) throw error;
      // Supabase will redirect to Google
    } catch (err: any) {
      console.error("Google signup error:", err);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex">
      {/* Left Side - Brand Info */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-purple-200 via-purple-100  to-blue-100 flex-col justify-between p-12">
        <div>
        
          
          <h1 className="text-2xl font-normal text-gray-900 mb-8">
            Create a <Link href="/" > <span className="text-2xl text-black theseason">RICHACLE </span> 
        </Link>
               account to get started with our platform!
          </h1>

          {/* Features List */}
          <div className="space-y-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full bg-gray-900 flex items-center justify-center">
                  <Check size={14} className="text-white" />
                </div>
                <h3 className="font-semibold text-gray-900">AI-Powered Analytics</h3>
              </div>
              <p className="text-gray-600 text-sm ml-8">Advanced data insights at your fingertips</p>
              <p className="text-gray-600 text-sm ml-8">Real-time performance tracking</p>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full bg-gray-900 flex items-center justify-center">
                  <Check size={14} className="text-white" />
                </div>
                <h3 className="font-semibold text-gray-900">Seamless Integration</h3>
              </div>
              <p className="text-gray-600 text-sm ml-8">Connect with your favorite tools</p>
              <p className="text-gray-600 text-sm ml-8">API access for custom workflows</p>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full bg-gray-900 flex items-center justify-center">
                  <Check size={14} className="text-white" />
                </div>
                <h3 className="font-semibold text-gray-900">Enterprise Security</h3>
              </div>
              <p className="text-gray-600 text-sm ml-8">Bank-level encryption for your data</p>
              <p className="text-gray-600 text-sm ml-8">SOC 2 Type II compliant</p>
            </div>
          </div>
        </div>

        {/* Trusted By Logos */}
        <div className="mt-12">
          <div className="grid grid-cols-4 gap-8 opacity-60">
            <div className="flex items-center justify-center">
              <div className="text-xl font-bold text-gray-700">OpenAI</div>
            </div>
            <div className="flex items-center justify-center">
              <div className="text-xl font-serif text-gray-700">TIME</div>
            </div>
            <div className="flex items-center justify-center">
              <div className="text-xl font-bold text-gray-700">airbnb</div>
            </div>
            <div className="flex items-center justify-center">
              <div className="text-xl font-bold text-gray-700">SAP</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Signup Form */}
      <div className="w-full lg:w-1/2 bg-white flex flex-col">
        {/* Header */}
        <header className="w-full px-8 py-6 flex items-center justify-end gap-3">
        {/* Brand Name */}
        <Link href="/" >
        <h1 className="text-2xl text-black theseason flex md:hidden">RICHACLE</h1>
        </Link>
          <div className="text-sm text-gray-700">
            Have an account?{" "}
            <Link href="/login" className="text-gray-800 font-medium hover:underline">
              Log in →
            </Link>
          </div>
        </header>

        {/* Form Content */}
        <div className="flex-1 flex items-center justify-center px-8 pb-20">
          <div className="w-full max-w-sm">
            <h1 className="text-center text-2xl font-normal text-gray-900 mb-8">
              Create your account
            </h1>

            {/* Terms Checkbox */}
            <div className="mb-6 flex items-start gap-3">
              <label htmlFor="terms" className="text-center text-gray-600 leading-relaxed">
                By proceeding, you agree to <span className="theseason">RICHACLE</span> {" "}
                <a href="/terms" className="text-blue-600 hover:underline">
                    Terms of Service
                </a>{" "}
                and acknowledge {" "}
                <a href="/policy" className="text-blue-600 hover:underline">
                   Privacy Policy
                </a>
                .
              </label>
            </div>

            {/* Google Sign Up Button */}
            <button
              onClick={signUpWithGoogle}
              disabled={loading}
              className={`w-full flex items-center justify-center gap-3 bg-zinc-900 text-white py-3.5 rounded-full font-medium transition-all shadow-sm mb-3 `}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              SIGN UP WITH GOOGLE
            </button>

            {/* Divider */}
            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-gray-300"></div>
              <span className="text-gray-500 text-sm">or</span>
              <div className="flex-1 h-px bg-gray-300"></div>
            </div>

            {/* Email Input */}
            <div className="mb-6">
              <div className="flex items-center gap-3 bg-gray-100 rounded-lg px-4 py-3.5 border border-transparent focus-within:border-gray-300 focus-within:bg-white transition-all">
                <Mail size={18} className="text-gray-600" />
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  required
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-transparent outline-none text-gray-800 placeholder-gray-500"
                />
              </div>
            </div>

            {/* Get Registration Link Button */}
            <button
              onClick={handleSignup}
              disabled={ loading}
              className={`w-full bg-black text-white py-3.5 rounded-full font-medium text-base transition-all shadow-sm`}
            >
              {loading ? "Sending..." : "Get Registration Link"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}