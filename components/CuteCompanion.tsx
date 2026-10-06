"use client";

import React, { useState, useEffect, useRef } from "react";
import { Sparkles, Shuffle, X, MessageCircleHeart, Gamepad2, Hand, PartyPopper, Eye } from "lucide-react";
import confetti from "canvas-confetti";

interface CuteCompanionProps {
  weatherTemp?: number;
  completedCount: number;
  totalCount: number;
  onOpenSpinner?: () => void;
  onOpenGame?: () => void;
  paused?: boolean;
}

const DIALOGUES = [
  "Princess mau dijemput jam berapa nih? Siap-siap yang santai yaa~",
  "Copilot siap siaga meluncur jemput! Jangan sampai telat yaa~",
  "Hari ini pelan-pelan aja. Yang penting jalannya bareng kamu.",
  "Jogja lagi syahdu banget nih bareng kamu sayang~",
  "Princess mau es krim atau kopi dulu hari ini?",
  "Copilot hati-hati di jalan yaa sayang!",
  "Ih kamu gemes banget, pencet-pencet Mochi terus~",
  "Lagi santai berdua? Yuk main Game Duel!",
  "Satu foto berdua hari ini, buat kenangan nanti ya?",
];

interface FloatingHeart {
  id: number;
  x: number;
  char: string;
}

type MascotMood = "normal" | "love" | "wink" | "happy";
type PlayAction = "pet" | "dance" | "peek" | null;

let mochiAudioContext: AudioContext | undefined;

function playMochiSound(action: Exclude<PlayAction, null>) {
  if (typeof window === "undefined") return;
  try {
    const Audio = window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Audio) return;
    mochiAudioContext ??= new Audio();
    const ctx = mochiAudioContext;
    const notes = action === "pet" ? [659, 784] : action === "dance" ? [523, 659, 784] : [784, 523];
    const play = () => {
      notes.forEach((frequency, index) => {
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = ctx.currentTime + index * 0.09;
        oscillator.type = action === "peek" ? "triangle" : "sine";
        oscillator.frequency.setValueAtTime(frequency, start);
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.045, start + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.16);
        oscillator.connect(gain);
        gain.connect(ctx.destination);
        oscillator.start(start);
        oscillator.stop(start + 0.18);
      });
    };
    if (ctx.state === "suspended") void ctx.resume().then(play).catch(() => {});
    else if (ctx.state === "running") play();
  } catch {
    // Sound is optional if the browser blocks Web Audio.
  }
}

export function CuteCompanion({
  weatherTemp,
  completedCount,
  totalCount,
  onOpenSpinner,
  onOpenGame,
  paused = false,
}: CuteCompanionProps) {
  const [dialogueIndex, setDialogueIndex] = useState(0);
  const [isBubbleOpen, setIsBubbleOpen] = useState(true);
  const [isBlinking, setIsBlinking] = useState(false);
  const [isHappyJump, setIsHappyJump] = useState(false);
  const [mood, setMood] = useState<MascotMood>("normal");
  const [playAction, setPlayAction] = useState<PlayAction>(null);
  const [isPlayOpen, setIsPlayOpen] = useState(false);
  const [hearts, setHearts] = useState<FloatingHeart[]>([]);
  const nextHeartId = useRef(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout>>();

  // Periodic blinking
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 220);
    }, 3200);
    return () => clearInterval(blinkInterval);
  }, []);

  // Periodic subtle mood auto-shift for lively character feeling
  useEffect(() => {
    const moodInterval = setInterval(() => {
      const moods: MascotMood[] = ["normal", "normal", "happy", "wink", "love"];
      const nextMood = moods[Math.floor(Math.random() * moods.length)];
      setMood(nextMood);
    }, 6000);
    return () => clearInterval(moodInterval);
  }, []);

  // Periodic dialogue auto-cycle if idle (every 18 seconds)
  useEffect(() => {
    const talkInterval = setInterval(() => {
      setDialogueIndex((prev) => (prev + 1) % DIALOGUES.length);
    }, 16000);
    return () => clearInterval(talkInterval);
  }, []);

  // When all tasks are completed, celebrate!
  useEffect(() => {
    if (totalCount > 0 && completedCount === totalCount) {
      setIsBubbleOpen(true);
      setMood("happy");
      triggerCelebration();
    }
  }, [completedCount, totalCount]);

  const triggerCelebration = () => {
    try {
      confetti({
        particleCount: 35,
        spread: 40,
        origin: { x: 0.85, y: 0.85 },
        colors: ["#ff2d78", "#ff94b9", "#00e676", "#ffe082"],
      });
    } catch {
      // Ignore
    }
  };

  const handleCompanionClick = () => {
    triggerPlayAction("pet");
  };

  const triggerPlayAction = (action: Exclude<PlayAction, null>) => {
    playMochiSound(action);
    setIsHappyJump(true);
    setPlayAction(action);
    clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(() => {
      setIsHappyJump(false);
      setPlayAction(null);
    }, action === "dance" ? 1200 : 720);

    setIsBubbleOpen(true);
    setMood(action === "peek" ? "wink" : action === "dance" ? "happy" : "love");
    const actionIndex = DIALOGUES.length + (action === "pet" ? 0 : action === "dance" ? 1 : 2);
    setDialogueIndex(actionIndex);

    // Spawn 2 floating heart/star particles
    const heartChars = ["♡", "✧"];
    for (let i = 0; i < 2; i++) {
      const char = heartChars[Math.floor(Math.random() * heartChars.length)];
      const offset = Math.floor(Math.random() * 50) - 25;
      const newHeart: FloatingHeart = {
        id: ++nextHeartId.current,
        x: offset,
        char,
      };

      setHearts((prev) => [...prev, newHeart]);
      setTimeout(() => {
        setHearts((prev) => prev.filter((h) => h.id !== newHeart.id));
      }, 1000);
    }
  };

  // Determine current dialogue text
  function getDialogue(index: number) {
    if (totalCount > 0 && completedCount === totalCount) {
      return "Wah hebat banget sayang, semua agenda hari ini beres! Yuk simpan kenangan di rekap.";
    }
    if (weatherTemp && weatherTemp >= 34 && index % 3 === 0) {
      return "Jogja lagi terik nih sayang! Jangan lupa minum dan istirahat di tempat adem yaa.";
    }
    if (index >= DIALOGUES.length) {
      return ["Hehe, Mochi senang dielus. Terima kasih yaa.", "Mochi lagi joget kecil. Jangan lupa ikut senyum!", "Cilukba! Mochi nemuin kalian berdua."][index - DIALOGUES.length] || DIALOGUES[0];
    }
    return DIALOGUES[index];
  }
  const currentText = getDialogue(dialogueIndex);

  useEffect(() => {
    return () => {
      clearTimeout(tapTimer.current);
    };
  }, []);

  return (
    <div className={`mochi-companion fixed bottom-3 right-3 z-30 select-none flex flex-col items-end pointer-events-none ${paused ? "invisible" : ""}`}>
      {/* Floating Heart Particles */}
      <div className="relative w-full pointer-events-none">
        {hearts.map((h) => (
          <span
            key={h.id}
            style={{
              left: `calc(50% + ${h.x}px)`,
              // @ts-expect-error CSS variable
              "--tx": `${h.x * 1.6}px`,
            }}
            className="absolute bottom-16 text-xl text-primary pointer-events-none animate-heart-rise"
          >
            {h.char}
          </span>
        ))}
      </div>

      {/* Speech Bubble */}
      {isBubbleOpen && (
        <div className="pointer-events-auto mb-3 w-[264px] max-w-[calc(100vw-32px)] bg-white/95 backdrop-blur-md border border-primary/20 rounded-2xl p-3.5 shadow-[0_8px_28px_rgba(0,33,18,0.08)] animate-bubble-pop relative">
          <div className="flex items-start justify-between gap-1 mb-1">
            <span className="text-[10px] font-space font-bold uppercase tracking-wider text-primary flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-primary animate-pulse" />
              Mochi
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsBubbleOpen(false);
              }}
              className="p-1.5 rounded-full text-text-muted/60 hover:text-text-main transition-colors"
              title="Tutup Balon Kata"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Dialogue Text */}
          <p
            key={currentText}
            className="font-inter text-xs font-medium text-text-main leading-relaxed animate-bubble-pop min-h-[3.25rem]"
          >
            {currentText}
          </p>

          {isPlayOpen && (
            <div className="mt-2.5 grid grid-cols-3 gap-1.5 animate-bubble-pop">
              <button type="button" onClick={() => triggerPlayAction("pet")} className="mochi-play-button">
                <Hand size={14} /><span>Elus</span>
              </button>
              <button type="button" onClick={() => triggerPlayAction("dance")} className="mochi-play-button">
                <PartyPopper size={14} /><span>Joget</span>
              </button>
              <button type="button" onClick={() => triggerPlayAction("peek")} className="mochi-play-button">
                <Eye size={14} /><span>Cilukba</span>
              </button>
            </div>
          )}

          {/* Action Row */}
          <div className="mt-2.5 pt-2 border-t border-primary/10 flex items-center justify-between gap-1">
            <button
              type="button"
              onClick={() => setIsPlayOpen((open) => !open)}
              className="text-[10px] font-space font-semibold text-text-muted hover:text-primary flex items-center gap-1 transition-colors"
              aria-expanded={isPlayOpen}
            >
              <span>Mainkan Mochi</span>
            </button>

            <div className="flex items-center gap-1">
              {onOpenGame && (
                <button
                  type="button"
                  onClick={onOpenGame}
                  className="px-2 py-0.5 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 text-[10px] font-space font-bold transition-all flex items-center gap-1 shadow-2xs active:scale-95 border border-emerald-500/20"
                >
                  <Gamepad2 className="w-2.5 h-2.5" />
                  <span>Duel</span>
                </button>
              )}

              {onOpenSpinner && (
                <button
                  type="button"
                  onClick={onOpenSpinner}
                  className="px-2 py-0.5 rounded-full bg-primary/10 hover:bg-primary/20 text-primary text-[10px] font-space font-bold transition-all flex items-center gap-1 shadow-2xs active:scale-95"
                >
                  <Shuffle className="w-2.5 h-2.5" />
                  <span>Acak</span>
                </button>
              )}
            </div>
          </div>

          {/* Bubble Arrow Tail */}
          <div className="absolute -bottom-1.5 right-6 w-3 h-3 bg-white border-r border-b border-primary/25 rotate-45" />
        </div>
      )}

      {/* Mascot Interactive Character */}
      <div className="pointer-events-auto flex items-center gap-1.5">
        {!isBubbleOpen && (
          <button
            type="button"
            onClick={() => setIsBubbleOpen(true)}
            className="animate-bounce bg-white/95 text-primary border border-primary/30 p-1.5 rounded-full shadow-md hover:bg-white transition-all text-xs flex items-center gap-1 px-2.5 font-space font-semibold"
            title="Buka Pesan Mochi"
          >
            <MessageCircleHeart className="w-3.5 h-3.5 text-primary" />
            <span className="text-[11px]">Sapa Mochi</span>
          </button>
        )}

        <button
          type="button"
          onClick={handleCompanionClick}
          aria-label="Pencet Mochi Lucu"
          className={`relative group cursor-pointer rounded-full focus-visible:outline focus-visible:outline-primary ${
            playAction === "dance" ? "mochi-dance" : playAction === "peek" ? "mochi-peek" : isHappyJump ? "mochi-jelly" : "transition-transform hover:scale-105 active:scale-95"
          }`}
        >
          {/* Outer Glow Halo */}
          <div className="absolute inset-0 rounded-full bg-primary/20 blur-md group-hover:bg-primary/35 transition-all pointer-events-none" />

          {/* Character SVG Container */}
          <div className="relative w-[72px] h-[72px] animate-float-gentle drop-shadow-[0_6px_16px_rgba(255,45,120,0.2)]">
            <svg
              viewBox="0 0 100 100"
              className="w-full h-full overflow-visible"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Fluffy Bunny Tail (Wagging behind on bottom left) */}
              <g className="animate-tail-wiggle">
                <circle cx="17" cy="74" r="7" fill="#ffffff" stroke="#ffb3cb" strokeWidth="2.2" />
                <circle cx="17" cy="74" r="4" fill="#fff5f8" />
              </g>

              {/* Left Ear (Dynamic wiggle) */}
              <g className="animate-ear-left">
                <ellipse
                  cx="33"
                  cy="25"
                  rx="9.5"
                  ry="21"
                  fill="#ffffff"
                  stroke="#ffb3cb"
                  strokeWidth="2.5"
                />
                <ellipse cx="33" cy="26" rx="5" ry="14" fill="#ff8fab" opacity="0.65" />
              </g>

              {/* Right Ear (Dynamic wiggle) */}
              <g className="animate-ear-right">
                <ellipse
                  cx="67"
                  cy="25"
                  rx="9.5"
                  ry="21"
                  fill="#ffffff"
                  stroke="#ffb3cb"
                  strokeWidth="2.5"
                />
                <ellipse cx="67" cy="26" rx="5" ry="14" fill="#ff8fab" opacity="0.65" />
              </g>

              {/* Accessory / Cute Flower Bow on Ear */}
              <g transform="translate(25, 30)">
                <circle cx="0" cy="0" r="3.5" fill="#ff2d78" />
                <circle cx="-3.5" cy="-2" r="2.5" fill="#ffb3cb" />
                <circle cx="3.5" cy="-2" r="2.5" fill="#ffb3cb" />
                <circle cx="0" cy="3.5" r="2.5" fill="#ffb3cb" />
                <circle cx="0" cy="0" r="1.5" fill="#ffffff" />
              </g>

              {/* Main Body (Marshmallow / Mochi Squish) */}
              <rect
                x="18"
                y="34"
                width="64"
                height="56"
                rx="28"
                fill="#ffffff"
                stroke="#ffb3cb"
                strokeWidth="2.5"
              />

              {/* Rosy Cheeks (Pulsing blush) */}
              <ellipse
                cx="29"
                cy="62"
                rx="6.5"
                ry="4"
                fill="#ff6b8b"
                className="animate-blush-pulse"
              />
              <ellipse
                cx="71"
                cy="62"
                rx="6.5"
                ry="4"
                fill="#ff6b8b"
                className="animate-blush-pulse"
              />

              {/* Eyes Expression Logic */}
              {mood === "love" ? (
                /* Heart Eyes */
                <g>
                  {/* Left Heart Eye */}
                  <path
                    d="M 35 48 C 35 44, 30 44, 30 48 C 30 52, 35 56, 35 56 C 35 56, 40 52, 40 48 C 40 44, 35 44, 35 48 Z"
                    fill="#ff2d78"
                  />
                  {/* Right Heart Eye */}
                  <path
                    d="M 65 48 C 65 44, 60 44, 60 48 C 60 52, 65 56, 65 56 C 65 56, 70 52, 70 48 C 70 44, 65 44, 65 48 Z"
                    fill="#ff2d78"
                  />
                </g>
              ) : mood === "wink" ? (
                /* Wink Eye (Left open boba, Right playful wink arc) */
                <g>
                  <ellipse cx="35" cy="52" rx="4.5" ry="5.5" fill="#002112" />
                  <circle cx="33.5" cy="50" r="1.8" fill="#ffffff" />
                  <circle cx="36.5" cy="53.5" r="0.9" fill="#ffffff" />
                  <path
                    d="M 61 53 Q 65 48 69 53"
                    stroke="#002112"
                    strokeWidth="2.8"
                    strokeLinecap="round"
                    fill="none"
                  />
                </g>
              ) : mood === "happy" ? (
                /* Smiling Crescent Eyes (> <) */
                <g>
                  <path
                    d="M 31 52 Q 35 47 39 52"
                    stroke="#002112"
                    strokeWidth="2.8"
                    strokeLinecap="round"
                    fill="none"
                  />
                  <path
                    d="M 61 52 Q 65 47 69 52"
                    stroke="#002112"
                    strokeWidth="2.8"
                    strokeLinecap="round"
                    fill="none"
                  />
                </g>
              ) : isBlinking ? (
                /* Closed Blinking Eyes */
                <g>
                  <path
                    d="M 31 53 Q 35 56 39 53"
                    stroke="#002112"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    fill="none"
                  />
                  <path
                    d="M 61 53 Q 65 56 69 53"
                    stroke="#002112"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    fill="none"
                  />
                </g>
              ) : (
                /* Shiny Boba Eyes with Sparkle Star pupil */
                <g>
                  {/* Left Eye */}
                  <ellipse cx="35" cy="52" rx="4.8" ry="5.8" fill="#002112" />
                  <circle cx="33.5" cy="50" r="2" fill="#ffffff" />
                  <circle cx="37" cy="53.5" r="1" fill="#ffffff" />

                  {/* Right Eye */}
                  <ellipse cx="65" cy="52" rx="4.8" ry="5.8" fill="#002112" />
                  <circle cx="63.5" cy="50" r="2" fill="#ffffff" />
                  <circle cx="67" cy="53.5" r="1" fill="#ffffff" />
                </g>
              )}

              {/* Nose & Cute Mouth */}
              <circle cx="50" cy="58" r="1.5" fill="#ff8fab" />
              {mood === "love" || mood === "happy" || isHappyJump ? (
                /* Open Happy Smiling Mouth */
                <path
                  d="M 45 61 Q 50 67 55 61 Z"
                  fill="#ff2d78"
                  stroke="#002112"
                  strokeWidth="1.2"
                />
              ) : (
                /* Cute Cat 'w' Mouth */
                <path
                  d="M 45 60 Q 47.5 63 50 60 Q 52.5 63 55 60"
                  stroke="#002112"
                  strokeWidth="2"
                  strokeLinecap="round"
                  fill="none"
                />
              )}

              {/* Left Paws (Holding a tiny heart or on tummy) */}
              <ellipse
                cx="38"
                cy="76"
                rx="5"
                ry="3.5"
                fill="#ffffff"
                stroke="#ffb3cb"
                strokeWidth="1.8"
              />

              {/* Right Waving Paw (Continuously waving softly) */}
              <g className="animate-paw-wave">
                <ellipse
                  cx="67"
                  cy="70"
                  rx="5.5"
                  ry="4"
                  fill="#ffffff"
                  stroke="#ffb3cb"
                  strokeWidth="1.8"
                />
              </g>

              {/* Tiny Feet */}
              <ellipse cx="36" cy="88" rx="6" ry="3" fill="#ffb3cb" opacity="0.85" />
              <ellipse cx="64" cy="88" rx="6" ry="3" fill="#ffb3cb" opacity="0.85" />
            </svg>
          </div>
        </button>
      </div>
    </div>
  );
}
