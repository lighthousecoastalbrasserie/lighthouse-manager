"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithPin } from "@/lib/auth";
import Image from "next/image";
import toast from "react-hot-toast";

export default function LoginPage() {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handlePinInput = (digit: string) => {
    if (pin.length < 4) {
      setPin((prev) => prev + digit);
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  const handleLogin = async () => {
    if (pin.length !== 4) {
      toast.error("Please enter your 4-digit PIN");
      return;
    }
    setLoading(true);
    const profile = await signInWithPin(pin);
    if (profile) {
      toast.success(`Welcome back, ${profile.name}!`);
      router.push("/dashboard");
    } else {
      toast.error("Invalid PIN. Please try again.");
      setPin("");
    }
    setLoading(false);
  };

  const digits = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-coral-50 flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <div className="mb-10 fade-in">
        <Image
          src="/logo.png"
          alt="Lighthouse Coastal Brasserie"
          width={280}
          height={90}
          priority
          className="object-contain"
        />
      </div>

      {/* Card */}
      <div className="card w-full max-w-sm fade-in">
        <h2 className="text-center text-navy-700 font-bold text-xl mb-2">
          Manager Login
        </h2>
        <p className="text-center text-gray-400 text-sm mb-8">
          Enter your 4-digit PIN to continue
        </p>

        {/* PIN Dots */}
        <div className="flex justify-center gap-4 mb-8">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full transition-all duration-200 ${
                i < pin.length
                  ? "bg-teal-400 scale-110"
                  : "bg-gray-200"
              }`}
            />
          ))}
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-3">
          {digits.map((digit, index) => (
            <button
              key={index}
              onClick={() => {
                if (digit === "⌫") handleDelete();
                else if (digit !== "") handlePinInput(digit);
              }}
              disabled={digit === ""}
              className={`
                h-16 rounded-2xl text-xl font-semibold transition-all duration-150 active:scale-95
                ${digit === ""
                  ? "invisible"
                  : digit === "⌫"
                  ? "bg-coral-50 text-coral-400 hover:bg-coral-100"
                  : "bg-teal-50 text-navy-700 hover:bg-teal-100"
                }
              `}
            >
              {digit}
            </button>
          ))}
        </div>

        {/* Login Button */}
        <button
          onClick={handleLogin}
          disabled={loading || pin.length !== 4}
          className={`btn-primary w-full mt-6 ${
            pin.length !== 4 ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </div>

      {/* Footer */}
      <p className="mt-8 text-gray-400 text-xs">
        Lighthouse Coastal Brasserie © {new Date().getFullYear()}
      </p>
    </div>
  );
}
