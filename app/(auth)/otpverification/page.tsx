"use client";

import { useState, useRef, useEffect, useCallback, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60;

export default function OTPVerificationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const email = searchParams.get("email") || "";
  const otpType = searchParams.get("type") || "signup"; // "signup" or "recovery"

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState("");

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Resend countdown timer
  useEffect(() => {
    if (resendTimer <= 0) return;
    const timer = setInterval(() => {
      setResendTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendTimer]);

  // Auto-focus first input on mount
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const maskedEmail = email
    ? email.replace(/(.{2})(.*)(@.*)/, (_, start, middle, end) => {
        const masked = "*".repeat(middle.length);
        return `${start}${masked}${end}`;
      })
    : "";

  const handleChange = useCallback((index: number, value: string) => {
    // Only accept digits
    if (value && !/\d/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1); // Take only last character
    setOtp(newOtp);
    setError("");

    // Auto-focus next input
    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }, [otp]);

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace") {
      if (!otp[index] && index > 0) {
        const newOtp = [...otp];
        newOtp[index - 1] = "";
        setOtp(newOtp);
        inputRefs.current[index - 1]?.focus();
      }
    }
    if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (pastedData.length === 0) return;

    const newOtp = [...Array(OTP_LENGTH).fill("")];
    pastedData.split("").forEach((char, i) => {
      newOtp[i] = char;
    });
    setOtp(newOtp);

    // Focus the next empty input or the last one
    const nextEmpty = newOtp.findIndex((v) => !v);
    const focusIndex = nextEmpty === -1 ? OTP_LENGTH - 1 : nextEmpty;
    inputRefs.current[focusIndex]?.focus();
  };

  const handleVerify = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    setError("");

    const otpValue = otp.join("");
    if (otpValue.length !== OTP_LENGTH) {
      setError("Please enter all 6 digits.");
      return;
    }

    if (!email) {
      setError("Email is missing. Please start over.");
      return;
    }

    setLoading(true);
    try {
 const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: otpValue,
        type: otpType === "recovery" ? "recovery" : "signup",
      });

      if (verifyError) {
        if (verifyError.message.includes("expired") || verifyError.message.includes("Invalid")) {
          setError("OTP has expired or is incorrect. Please try again or request a new one.");
        } else {
          setError("Verification failed. Please try again.");
        }
        return;
      }

      // Success!
      setSuccess(true);

      // After showing success dialog, navigate
      setTimeout(async () => {
        const { data: { user } } = await supabase.auth.getUser();
        setNavigating(true);
        if (user) {
          if (otpType === "recovery") {
            router.push(`/newpassword?email=${encodeURIComponent(email)}`);
          } else {
            router.push(`/${user.id}`);
          }
        } else {
          router.push("/");
        }
      }, 2000);
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0 || resendLoading || !email) return;

    setResendLoading(true);
    setResendMessage("");

    try {
      if (otpType === "recovery") {
        const { error: resendError } = await supabase.auth.resetPasswordForEmail(email);
        if (resendError) {
          setResendMessage("Failed to resend OTP. Please try again.");
          return;
        }
      } else {
        const { error: resendError } = await supabase.auth.resend({
          type: "signup",
          email,
        });
        if (resendError) {
          setResendMessage("Failed to resend OTP. Please try again.");
          return;
        }
      }

      setResendTimer(RESEND_COOLDOWN);
      setOtp(Array(OTP_LENGTH).fill(""));
      setResendMessage("OTP sent successfully!");
      inputRefs.current[0]?.focus();
    } catch {
      setResendMessage("Failed to resend OTP. Please try again.");
    } finally {
      setResendLoading(false);
    }
  };

  const handleNavigation = (href: string) => {
    setNavigating(true);
    router.push(href);
  };

  // Loading / navigating state
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
          onClick={() => handleNavigation(otpType === "recovery" ? "/forgotpassword" : "/signup")}
          className="mb-6 flex items-center gap-2 text-sm text-indigo-300 transition-colors hover:text-indigo-100"
          disabled={loading || navigating}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        {/* Logo */}
        <div className="mb-6 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="text-2xl font-bold text-white">CodeWix</span>
          </Link>
        </div>

        {/* OTP display message */}
        <div className="mb-6 text-center">
          <p className="text-sm text-indigo-300">
            OTP sent to{" "}
            <span className="inline-flex items-center gap-1 font-semibold text-white">
              {email || "your email"}
              <CheckCircle2 className="h-4 w-4 text-blue-400" />
            </span>
          </p>
        </div>

        {/* Success Dialog */}
        {success && (
          <div className="mb-6 rounded-2xl border border-green-500/30 bg-green-500/10 p-8 text-center backdrop-blur-xl">
            <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-green-400" />
            <h2 className="text-xl font-bold text-white">OTP VERIFIED SUCCESSFULLY</h2>
            <p className="mt-2 text-sm text-green-300">Redirecting you now...</p>
          </div>
        )}

        {/* OTP Form Card */}
        {!success && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">
            <form onSubmit={handleVerify} className="space-y-6">
              {/* Error message */}
              {error && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {error}
                </div>
              )}

              {/* Resend success message */}
              {resendMessage && (
                <div className={`rounded-lg border px-4 py-3 text-sm ${
                  resendMessage.includes("success")
                    ? "border-green-500/30 bg-green-500/10 text-green-300"
                    : "border-red-500/30 bg-red-500/10 text-red-300"
                }`}>
                  {resendMessage}
                </div>
              )}

              {/* OTP Inputs */}
              <div>
                <label className="mb-3 block text-center text-sm font-medium text-indigo-200">
                  Enter the 6-digit code
                </label>
                <div className="flex justify-center gap-2 sm:gap-3">
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => { inputRefs.current[index] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      onPaste={index === 0 ? handlePaste : undefined}
                      disabled={loading}
                      autoComplete="one-time-code"
                      className="h-13 w-11 rounded-lg border border-white/10 bg-white/5 text-center text-lg font-semibold text-white outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50 sm:h-14 sm:w-13"
                    />
                  ))}
                </div>
              </div>

              {/* Verify Button */}
              <button
                type="submit"
                disabled={loading || otp.join("").length !== OTP_LENGTH}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-[#1a1640] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify & Continue"
                )}
              </button>

              {/* Resend OTP */}
              <div className="text-center text-sm text-indigo-400">
                Didn&apos;t receive the code?{" "}
                {resendTimer > 0 ? (
                  <span className="text-indigo-300">
                    Resend in {resendTimer}s
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendLoading}
                    className="font-semibold text-indigo-300 transition-colors hover:text-indigo-100 disabled:opacity-50"
                  >
                    {resendLoading ? "Sending..." : "Resend OTP"}
                  </button>
                )}
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
