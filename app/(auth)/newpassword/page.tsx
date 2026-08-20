"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Eye, EyeOff, ArrowLeft, Loader2, Check, X } from "lucide-react";

const PASSWORD_RULES = [
  { id: "length", label: "6 to 18 characters", test: (p: string) => p.length >= 6 && p.length <= 18 },
  { id: "uppercase", label: "At least one capital letter", test: (p: string) => /[A-Z]/.test(p) },
  { id: "lowercase", label: "At least one small letter", test: (p: string) => /[a-z]/.test(p) },
  { id: "number", label: "At least one number", test: (p: string) => /[0-9]/.test(p) },
];

export default function NewPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const email = searchParams.get("email") || "";

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const [error, setError] = useState("");

  const allRulesPassed = PASSWORD_RULES.every((r) => r.test(password));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!password) { setError("Password is required."); return; }
    if (!allRulesPassed) { setError("Please meet all password requirements."); return; }

    setLoading(true);
    try {
      // Update the user's password
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        if (updateError.message.includes("same as the old password")) {
          setError("New password must be different from your old password.");
        } else {
          setError("Failed to update password. Please try again.");
        }
        return;
      }

      // Sign out and redirect to sign in
      await supabase.auth.signOut();
      setNavigating(true);
      router.push("/signin");
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleNavigation = (href: string) => {
    setNavigating(true);
    router.push(href);
  };

  if (navigating) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-400 border-t-transparent" />
          <p className="text-sm text-indigo-200">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Back button */}
        <button
          onClick={() => handleNavigation("/otpverification")}
          className="mb-6 flex items-center gap-2 text-sm text-indigo-300 transition-colors hover:text-indigo-100"
          disabled={loading || navigating}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        {/* Logo */}
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="text-2xl font-bold text-white">CodeWix</span>
          </Link>
          <p className="mt-2 text-sm text-indigo-300">Set your new password</p>
        </div>

        {/* Form Card */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Error message */}
            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            {/* Password */}
            <div>
              <label htmlFor="new-password" className="mb-1.5 block text-sm font-medium text-indigo-200">
                New Password
              </label>
              <div className="relative">
                <input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  placeholder="Create a new password"
                  autoComplete="new-password"
                  disabled={loading}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 pr-12 text-sm text-white placeholder-indigo-400/60 outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-400 transition-colors hover:text-indigo-200"
                  tabIndex={-1}
                  disabled={loading}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>

              {/* Password Rules */}
              {password.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {PASSWORD_RULES.map((rule) => (
                    <div key={rule.id} className="flex items-center gap-2 text-xs">
                      {rule.test(password) ? (
                        <Check className="h-3.5 w-3.5 text-green-400" />
                      ) : (
                        <X className="h-3.5 w-3.5 text-red-400/60" />
                      )}
                      <span className={rule.test(password) ? "text-green-400" : "text-indigo-400/60"}>
                        {rule.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !allRulesPassed}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-[#1a1640] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Updating Password...
                </>
              ) : (
                "Update Password"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
