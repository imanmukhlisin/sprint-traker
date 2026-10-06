"use client";

import React, { useEffect, useState } from "react";
import { ArrowRight, Heart, MapPin, Sparkles } from "lucide-react";

interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [isLeaving, setIsLeaving] = useState(false);

  const finish = () => {
    if (isLeaving) return;
    setIsLeaving(true);
    window.setTimeout(onComplete, 420);
  };

  useEffect(() => {
    const timer = window.setTimeout(finish, 2800);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <main
      className={`splash-screen min-h-[100dvh] overflow-hidden px-5 py-6 ${
        isLeaving ? "splash-screen--leaving" : ""
      }`}
    >
      <div className="relative z-10 mx-auto flex min-h-[calc(100dvh-3rem)] w-full max-w-sm flex-col items-center justify-between">
        <div className="flex w-full items-center justify-between animate-splash-enter">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-white/70 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-primary font-space">
            <span className="h-1.5 w-1.5 rounded-full bg-[#00e676]" />
            Date mode on
          </div>
          <button
            type="button"
            onClick={finish}
            className="rounded-full px-2 py-1 text-xs font-semibold text-text-muted transition-colors hover:text-text-main font-space"
          >
            Lewati
          </button>
        </div>

        <section className="flex w-full flex-col items-center text-center">
          <div className="relative mb-7 animate-splash-mascot">
            <span className="absolute -left-7 top-2 text-primary/55 animate-splash-sparkle"><Sparkles size={18} /></span>
            <span className="absolute -right-8 bottom-6 text-primary/45 animate-splash-sparkle-delayed"><Heart size={16} fill="currentColor" /></span>
            <div className="splash-mochi relative flex h-32 w-32 items-center justify-center rounded-[42%] border border-white/90 bg-white shadow-[0_18px_42px_rgba(255,45,120,0.2)]">
              <span className="absolute -top-8 left-7 h-12 w-6 rotate-[-8deg] rounded-full border-2 border-[#ffb3cb] bg-white" />
              <span className="absolute -top-8 right-7 h-12 w-6 rotate-[8deg] rounded-full border-2 border-[#ffb3cb] bg-white" />
              <div className="relative mt-2 flex items-center gap-6">
                <span className="relative h-4 w-3 rounded-full bg-text-main after:absolute after:left-0.5 after:top-0.5 after:h-1.5 after:w-1.5 after:rounded-full after:bg-white" />
                <span className="relative h-4 w-3 rounded-full bg-text-main after:absolute after:left-0.5 after:top-0.5 after:h-1.5 after:w-1.5 after:rounded-full after:bg-white" />
              </div>
              <span className="absolute bottom-8 h-2 w-2 rounded-full bg-[#ff8fab]" />
              <span className="absolute bottom-4 text-sm font-bold text-text-main">⌣</span>
              <span className="absolute bottom-9 left-5 h-3 w-6 rounded-full bg-[#ffb3cb]/80" />
              <span className="absolute bottom-9 right-5 h-3 w-6 rounded-full bg-[#ffb3cb]/80" />
            </div>
          </div>

          <p className="mb-2 animate-splash-enter-delay font-space text-xs font-bold uppercase tracking-[0.18em] text-primary">
            Jogja date itinerary
          </p>
          <h1 className="animate-splash-enter-delay-2 font-sora text-[2rem] font-black leading-none tracking-tight text-text-main">
            Tata Sprint<br />Treker
          </h1>
          <p className="mt-4 max-w-[260px] animate-splash-enter-delay-3 font-inter text-sm leading-relaxed text-text-muted">
            Satu perjalanan kecil, banyak memori manis berdua.
          </p>
        </section>

        <div className="w-full animate-splash-enter-delay-3">
          <div className="mb-5 flex items-center justify-between px-2 text-[11px] font-semibold text-text-muted font-space">
            <span>Menyiapkan rencana jalan</span>
            <span className="text-primary">siap</span>
          </div>
          <div className="splash-route relative mb-6 h-1.5 rounded-full bg-white/85">
            <span className="absolute -left-1 -top-2.5 rounded-full border border-primary/15 bg-white p-1 text-primary"><MapPin size={12} fill="currentColor" /></span>
            <span className="splash-route-dot absolute -top-1.5 rounded-full bg-primary shadow-[0_0_0_5px_rgba(255,45,120,0.12)]" />
            <span className="absolute -right-1 -top-2.5 rounded-full border border-primary/15 bg-white p-1 text-primary"><Heart size={12} fill="currentColor" /></span>
          </div>
          <button
            type="button"
            onClick={finish}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary font-sora text-sm font-bold text-white shadow-[0_10px_20px_rgba(255,45,120,0.22)] transition-transform hover:bg-primary-hover active:scale-[0.98]"
          >
            Mulai jalan
            <ArrowRight size={17} />
          </button>
        </div>
      </div>
    </main>
  );
}
