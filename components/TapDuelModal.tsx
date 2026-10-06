"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { X, RotateCw, Trophy, Zap, Flame, RefreshCw, Layers, Volume2, VolumeX } from "lucide-react";
import confetti from "canvas-confetti";
import {
  playTapSound,
  playBeepSound,
  playGoSound,
  playFoulSound,
  playRoundWinSound,
  playVictoryFanfare,
  playFlipSound,
  playMatchSound,
  isSoundMuted,
  toggleSoundMute,
} from "@/lib/sound-effects";

interface TapDuelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type GameMode = "reaction" | "tug" | "memory";
type ReactionState = "waiting" | "ready" | "go" | "foul" | "round_over";

const PUNISHMENTS = [
  "Tatap mata pasangan selama 10 detik tanpa boleh ketawa.",
  "Sebutkan 3 hal yang kamu suka dari pasangan hari ini.",
  "Janji kelingking buat tetap manis sepanjang trip.",
  "Berikan pelukan hangat selama 5 detik.",
  "Tirukan gaya manja pasangan sampai mereka tersenyum.",
  "Ucapkan: kamu yang paling gemes sedunia.",
  "Gandeng tangan pasangan sampai spot berikutnya.",
  "Sama-sama menang karena hari ini terlalu manis.",
];

const MEMORY_ITEMS = [
  { id: "gelato", label: "Gelato", icon: "🍦", bg: "bg-pink-50 border-pink-200 text-pink-700" },
  { id: "bakpia", label: "Bakpia", icon: "🥮", bg: "bg-amber-50 border-amber-200 text-amber-700" },
  { id: "kopi", label: "Kopi", icon: "☕️", bg: "bg-orange-50 border-orange-200 text-orange-700" },
  { id: "gudeg", label: "Gudeg", icon: "🍛", bg: "bg-red-50 border-red-200 text-red-700" },
  { id: "kamera", label: "Foto", icon: "📸", bg: "bg-purple-50 border-purple-200 text-purple-700" },
  { id: "cinta", label: "Cinta", icon: "💖", bg: "bg-rose-50 border-rose-200 text-rose-700" },
];

interface MemoryCard {
  uniqueId: number;
  pairId: string;
  label: string;
  icon: string;
  bg: string;
  isFlipped: boolean;
  isMatched: boolean;
  matchedBy?: "Princess" | "Copilot";
}

// Synth sounds using Web Audio API
function playSound(type: "beep" | "go" | "win" | "foul" | "tap" | "flip" | "match" | "fanfare") {
  switch (type) {
    case "tap":
      playTapSound();
      break;
    case "beep":
      playBeepSound();
      break;
    case "go":
      playGoSound();
      break;
    case "foul":
      playFoulSound();
      break;
    case "win":
      playRoundWinSound();
      break;
    case "match":
      playMatchSound();
      break;
    case "fanfare":
      playVictoryFanfare();
      break;
    case "flip":
      playFlipSound();
      break;
  }
}

export function TapDuelModal({ isOpen, onClose }: TapDuelModalProps) {
  const [mode, setMode] = useState<GameMode>("reaction");
  const [isTopFlipped, setIsTopFlipped] = useState(true); // Flipped 180deg for face-to-face table seating
  const [princessScore, setPrincessScore] = useState(0);
  const [copilotScore, setCopilotScore] = useState(0);
  const [targetScore] = useState(3); // First to 3 wins match
  const [matchWinner, setMatchWinner] = useState<"Princess" | "Copilot" | "Seri" | null>(null);
  const [punishment, setPunishment] = useState("");
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    setIsMuted(isSoundMuted());
  }, []);

  const handleToggleMute = () => {
    const next = toggleSoundMute();
    setIsMuted(next);
    if (!next) playTapSound();
  };

  // Mode 1: Reaction state
  const [reactionState, setReactionState] = useState<ReactionState>("waiting");
  const [, setRoundWinner] = useState<"Princess" | "Copilot" | null>(null);
  const [reactionMsg, setReactionMsg] = useState("Tekan Mulai Ronde!");
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Mode 2: Tug of War state
  const [tugPosition, setTugPosition] = useState(50); // 0 = Princess wins, 100 = Copilot wins
  const [tugTimer, setTugTimer] = useState(7);
  const [isTugActive, setIsTugActive] = useState(false);
  const [tugWinner, setTugWinner] = useState<"Princess" | "Copilot" | null>(null);
  const tugIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Mode 3: Memory Match state
  const [memoryCards, setMemoryCards] = useState<MemoryCard[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [currentTurn, setCurrentTurn] = useState<"Princess" | "Copilot">("Princess");
  const [isCheckingMatch, setIsCheckingMatch] = useState(false);
  const [memoryScores, setMemoryScores] = useState({ Princess: 0, Copilot: 0 });

  const initializeMemoryGame = useCallback(() => {
    const deck: MemoryCard[] = [];
    let uId = 0;
    MEMORY_ITEMS.forEach((item) => {
      // 2 cards per item = 12 cards total
      deck.push({
        uniqueId: uId++,
        pairId: item.id,
        label: item.label,
        icon: item.icon,
        bg: item.bg,
        isFlipped: false,
        isMatched: false,
      });
      deck.push({
        uniqueId: uId++,
        pairId: item.id,
        label: item.label,
        icon: item.icon,
        bg: item.bg,
        isFlipped: false,
        isMatched: false,
      });
    });

    // Shuffle
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    setMemoryCards(deck);
    setFlippedCards([]);
    setCurrentTurn("Princess");
    setMemoryScores({ Princess: 0, Copilot: 0 });
    setIsCheckingMatch(false);
  }, []);

  const resetMatch = useCallback(() => {
    setPrincessScore(0);
    setCopilotScore(0);
    setMatchWinner(null);
    setRoundWinner(null);
    setPunishment("");
    setReactionState("waiting");
    setReactionMsg("Tekan Mulai Ronde!");
    setTugPosition(50);
    setTugTimer(7);
    setIsTugActive(false);
    setTugWinner(null);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (tugIntervalRef.current) clearInterval(tugIntervalRef.current);
    initializeMemoryGame();
  }, [initializeMemoryGame]);

  useEffect(() => {
    if (isOpen) {
      resetMatch();
    } else {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (tugIntervalRef.current) clearInterval(tugIntervalRef.current);
    }
  }, [isOpen, resetMatch]);

  const triggerMatchConfetti = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.5 },
        colors: ["#ff2d78", "#00e676", "#ffe082", "#ffffff"],
      });
    } catch {
      // Ignore
    }
  };

  const pickRandomPunishment = () => {
    const random = PUNISHMENTS[Math.floor(Math.random() * PUNISHMENTS.length)];
    setPunishment(random);
  };

  // Check for Match Winner in Reaction & Tug
  useEffect(() => {
    if (mode !== "memory" && !matchWinner) {
      if (princessScore >= targetScore) {
        setMatchWinner("Princess");
        playSound("fanfare");
        triggerMatchConfetti();
        pickRandomPunishment();
      } else if (copilotScore >= targetScore) {
        setMatchWinner("Copilot");
        playSound("fanfare");
        triggerMatchConfetti();
        pickRandomPunishment();
      }
    }
  }, [princessScore, copilotScore, targetScore, matchWinner, mode]);

  // Check for Match Winner in Memory Mode (Total 6 pairs)
  useEffect(() => {
    if (mode === "memory" && memoryCards.length > 0 && !matchWinner) {
      const allMatched = memoryCards.every((c) => c.isMatched);
      if (allMatched) {
        if (memoryScores.Princess > memoryScores.Copilot) {
          setMatchWinner("Princess");
          playSound("fanfare");
          triggerMatchConfetti();
          pickRandomPunishment();
        } else if (memoryScores.Copilot > memoryScores.Princess) {
          setMatchWinner("Copilot");
          playSound("fanfare");
          triggerMatchConfetti();
          pickRandomPunishment();
        } else {
          setMatchWinner("Seri");
          playSound("fanfare");
          triggerMatchConfetti();
          setPunishment("Sama-sama jago! Saling peluk & janji hepi terus sepanjang trip 💕");
        }
      }
    }
  }, [memoryCards, memoryScores, mode, matchWinner]);

  // --- REACTION MODE LOGIC ---
  const startReactionRound = () => {
    if (matchWinner) return;
    setRoundWinner(null);
    setReactionState("ready");
    setReactionMsg("Tunggu warna HIJAU... Jangan terburu-buru!");
    playSound("beep");

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    const delay = Math.floor(Math.random() * 2400) + 1800;
    timeoutRef.current = setTimeout(() => {
      setReactionState("go");
      setReactionMsg("TAP SEKARANG! ⚡️");
      playSound("go");
    }, delay);
  };

  const handleReactionTap = (player: "Princess" | "Copilot") => {
    if (matchWinner) return;

    if (reactionState === "ready") {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setReactionState("foul");
      playSound("foul");

      const otherPlayer = player === "Princess" ? "Copilot" : "Princess";
      setReactionMsg(`${player} kecepetan! Pelanggaran 🙈 Poin buat ${otherPlayer}!`);

      if (otherPlayer === "Princess") {
        setPrincessScore((s) => s + 1);
      } else {
        setCopilotScore((s) => s + 1);
      }
      return;
    }

    if (reactionState === "go") {
      setReactionState("round_over");
      setRoundWinner(player);
      playSound("win");
      setReactionMsg(`${player} lebih cepat! Poin +1 🎉`);

      if (player === "Princess") {
        setPrincessScore((s) => s + 1);
      } else {
        setCopilotScore((s) => s + 1);
      }
    }
  };

  // --- TUG OF WAR LOGIC ---
  const startTugRound = () => {
    if (matchWinner) return;
    setTugPosition(50);
    setTugTimer(7);
    setIsTugActive(true);
    setTugWinner(null);
    playSound("go");

    if (tugIntervalRef.current) clearInterval(tugIntervalRef.current);

    tugIntervalRef.current = setInterval(() => {
      setTugTimer((prev) => {
        if (prev <= 1) {
          if (tugIntervalRef.current) clearInterval(tugIntervalRef.current);
          setIsTugActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    if (mode === "tug" && tugTimer === 0 && !isTugActive && !matchWinner && !tugWinner) {
      if (tugPosition < 50) {
        setTugWinner("Princess");
        setPrincessScore((s) => s + 1);
        playSound("win");
      } else if (tugPosition > 50) {
        setTugWinner("Copilot");
        setCopilotScore((s) => s + 1);
        playSound("win");
      } else {
        playSound("beep");
      }
    }
  }, [tugTimer, isTugActive, tugPosition, mode, matchWinner, tugWinner]);

  const handleTugTap = (player: "Princess" | "Copilot") => {
    if (!isTugActive || matchWinner) return;
    playSound("tap");

    setTugPosition((prev) => {
      const step = 3;
      if (player === "Princess") {
        const next = Math.max(5, prev - step);
        if (next <= 5) {
          if (tugIntervalRef.current) clearInterval(tugIntervalRef.current);
          setIsTugActive(false);
          setTugWinner("Princess");
          setPrincessScore((s) => s + 1);
          playSound("win");
        }
        return next;
      } else {
        const next = Math.min(95, prev + step);
        if (next >= 95) {
          if (tugIntervalRef.current) clearInterval(tugIntervalRef.current);
          setIsTugActive(false);
          setTugWinner("Copilot");
          setCopilotScore((s) => s + 1);
          playSound("win");
        }
        return next;
      }
    });
  };

  // --- MEMORY MATCH LOGIC ---
  const handleMemoryCardClick = (cardIndex: number) => {
    if (isCheckingMatch || matchWinner) return;
    if (flippedCards.length >= 2) return;
    if (memoryCards[cardIndex].isFlipped || memoryCards[cardIndex].isMatched) return;

    playSound("flip");

    const newCards = [...memoryCards];
    newCards[cardIndex].isFlipped = true;
    setMemoryCards(newCards);

    const newFlipped = [...flippedCards, cardIndex];
    setFlippedCards(newFlipped);

    if (newFlipped.length === 2) {
      setIsCheckingMatch(true);
      const [firstIdx, secondIdx] = newFlipped;
      const firstCard = newCards[firstIdx];
      const secondCard = newCards[secondIdx];

      if (firstCard.pairId === secondCard.pairId) {
        // MATCH!
        playSound("match");
        setTimeout(() => {
          newCards[firstIdx].isMatched = true;
          newCards[secondIdx].isMatched = true;
          newCards[firstIdx].matchedBy = currentTurn;
          newCards[secondIdx].matchedBy = currentTurn;
          setMemoryCards([...newCards]);
          setFlippedCards([]);
          setMemoryScores((prev) => ({
            ...prev,
            [currentTurn]: prev[currentTurn] + 1,
          }));
          setIsCheckingMatch(false);
        }, 500);
      } else {
        // MISMATCH
        playSound("beep");
        setTimeout(() => {
          newCards[firstIdx].isFlipped = false;
          newCards[secondIdx].isFlipped = false;
          setMemoryCards([...newCards]);
          setFlippedCards([]);
          setCurrentTurn((prev) => (prev === "Princess" ? "Copilot" : "Princess"));
          setIsCheckingMatch(false);
        }, 900);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs select-none">
      <div className="relative w-full h-full max-w-md bg-white flex flex-col overflow-hidden shadow-2xl">
        {/* Top Control Bar */}
        <div className="h-12 bg-white/95 border-b border-primary/20 px-2.5 flex items-center justify-between shrink-0 z-20">
          {/* Mode Switcher (3 Games) */}
          <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-full text-[11px] font-space font-semibold overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => {
                setMode("reaction");
                resetMatch();
              }}
              className={`px-2 py-1 rounded-full transition-all flex items-center gap-1 shrink-0 ${
                mode === "reaction"
                  ? "bg-primary text-white shadow-xs"
                  : "text-text-muted hover:text-text-main"
              }`}
            >
              <Zap className="w-3 h-3" />
              <span>Reaksi</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMode("tug");
                resetMatch();
              }}
              className={`px-2 py-1 rounded-full transition-all flex items-center gap-1 shrink-0 ${
                mode === "tug"
                  ? "bg-[#002112] text-white shadow-xs"
                  : "text-text-muted hover:text-text-main"
              }`}
            >
              <Flame className="w-3 h-3" />
              <span>Tarik</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMode("memory");
                resetMatch();
              }}
              className={`px-2 py-1 rounded-full transition-all flex items-center gap-1 shrink-0 ${
                mode === "memory"
                  ? "bg-gradient-to-r from-primary to-purple-600 text-white shadow-xs"
                  : "text-text-muted hover:text-text-main"
              }`}
            >
              <Layers className="w-3 h-3" />
              <span>Kartu Kembar</span>
            </button>
          </div>

          {/* Right Action Icons */}
          <div className="flex items-center gap-1">
            {mode !== "memory" && (
              <button
                type="button"
                onClick={() => setIsTopFlipped((prev) => !prev)}
                className={`p-1.5 rounded-full border transition-all text-xs ${
                  isTopFlipped
                    ? "bg-primary/10 border-primary/30 text-primary"
                    : "bg-gray-100 border-gray-200 text-text-muted"
                }`}
                title="Putar Orientasi Princess (Duduk Berhadapan)"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={handleToggleMute}
              className={`p-1.5 rounded-full border transition-all text-xs ${
                isMuted
                  ? "bg-red-50 border-red-200 text-red-500"
                  : "bg-primary/10 border-primary/30 text-primary"
              }`}
              title={isMuted ? "Nyalakan Suara Game" : "Matikan Suara Game"}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              onClick={resetMatch}
              className="p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-text-muted transition-colors"
              title="Reset Permainan"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full bg-gray-100 hover:bg-red-50 text-text-muted hover:text-red-500 transition-colors"
              title="Keluar"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Score Board Header */}
        <div className="bg-[#e8ffee]/70 border-b border-primary/15 py-1.5 px-4 flex items-center justify-between text-xs font-space font-bold shrink-0 z-10">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-primary" />
            <span className="text-primary font-bold">Princess</span>
            <span className="text-sm font-extrabold px-2 py-0.5 rounded-lg bg-white border border-primary/20">
              {mode === "memory" ? memoryScores.Princess : princessScore}
            </span>
          </div>

          <span className="text-[11px] text-text-muted font-medium">
            {mode === "memory" ? "Total 6 Pasang" : `First to ${targetScore}`}
          </span>

          <div className="flex items-center gap-2">
            <span className="text-sm font-extrabold px-2 py-0.5 rounded-lg bg-white border border-black/20">
              {mode === "memory" ? memoryScores.Copilot : copilotScore}
            </span>
            <span className="text-[#002112] font-bold">Copilot</span>
            <span className="w-2.5 h-2.5 rounded-full bg-[#002112]" />
          </div>
        </div>

        {/* MATCH WINNER MODAL OVERLAY */}
        {matchWinner && (
          <div className="absolute inset-0 z-40 bg-white/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-bubble-pop">
            <div className="w-16 h-16 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center mb-3 shadow-md">
              <Trophy className="w-8 h-8 text-primary animate-bounce" />
            </div>

            <h2 className="font-sora font-extrabold text-2xl text-text-main mb-1">
              {matchWinner === "Seri" ? "Hasil Imbang! 🤝" : `${matchWinner} Menang! 🎉`}
            </h2>
            <p className="font-space text-xs text-text-muted mb-5">
              Skor:{" "}
              {mode === "memory"
                ? `${memoryScores.Princess} - ${memoryScores.Copilot} Pasang`
                : `${princessScore} - ${copilotScore}`}
            </p>

            {/* Hukuman Card */}
            <div className="w-full max-w-xs p-4 rounded-2xl bg-primary/5 border border-primary/20 mb-6 text-left shadow-xs">
              <span className="block font-space text-[10px] font-bold uppercase tracking-wider text-primary mb-1">
                Pesan manis untuk kalian
              </span>
              <p className="font-inter text-sm font-semibold text-text-main leading-snug">
                {punishment}
              </p>
            </div>

            <div className="flex items-center gap-3 w-full max-w-xs">
              <button
                type="button"
                onClick={resetMatch}
                className="flex-1 py-3 rounded-xl bg-primary hover:bg-primary-hover text-white font-sora font-bold text-sm shadow-md active:scale-95 transition-all"
              >
                Tanding Ulang ⚔️
              </button>
              <button
                type="button"
                onClick={onClose}
                className="py-3 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 text-text-main font-space text-xs font-semibold transition-all"
              >
                Selesai
              </button>
            </div>
          </div>
        )}

        {/* --- GAME FIELD (SWITCHED BY MODE) --- */}
        {mode === "memory" ? (
          /* MODE 3: MEMORY MATCH FLIP */
          <div className="flex-1 flex flex-col justify-between p-3.5 bg-gradient-to-b from-[#e8ffee]/30 to-white overflow-y-auto no-scrollbar">
            {/* Turn Indicator Banner */}
            <div className="flex items-center justify-center mb-2">
              <div
                className={`px-4 py-1.5 rounded-full text-xs font-space font-bold flex items-center gap-1.5 shadow-xs transition-all ${
                  currentTurn === "Princess"
                    ? "bg-primary text-white shadow-[0_2px_10px_rgba(255,45,120,0.3)] animate-pulse"
                    : "bg-[#002112] text-white shadow-[0_2px_10px_rgba(0,33,18,0.3)] animate-pulse"
                }`}
              >
                <span>Giliran {currentTurn}</span>
                <span className="text-[10px] font-normal opacity-90">(Pilih 2 kartu)</span>
              </div>
            </div>

            {/* 12 Cards Grid (4 columns x 3 rows) */}
            <div className="grid grid-cols-4 gap-2.5 w-full max-w-xs mx-auto flex-1 items-center content-center py-2">
              {memoryCards.map((card, idx) => {
                const isRevealed = card.isFlipped || card.isMatched;

                return (
                  <button
                    key={card.uniqueId}
                    type="button"
                    onClick={() => handleMemoryCardClick(idx)}
                    disabled={card.isMatched || card.isFlipped || isCheckingMatch}
                    className={`memory-card aspect-square rounded-2xl relative select-none active:scale-95 ${
                      card.isMatched
                        ? card.matchedBy === "Princess"
                          ? "bg-pink-100/80 border-primary text-primary"
                          : "bg-emerald-100/80 border-emerald-700 text-emerald-800"
                        : isRevealed
                        ? `${card.bg} border-primary/40`
                        : "bg-gradient-to-br from-white to-pink-50 border-primary/20 hover:border-primary/50"
                    }`}
                  >
                    <div className={`memory-card__inner ${isRevealed ? "memory-card__inner--flipped" : ""}`}>
                      <div className="memory-card__face memory-card__back flex flex-col items-center justify-center text-primary/50 border border-primary/20">
                        <span className="text-lg font-bold">✦</span>
                        <span className="text-[8px] font-space font-semibold text-text-muted/60 mt-0.5">TATA</span>
                      </div>
                      <div className={`memory-card__face memory-card__front flex flex-col items-center justify-center border-2 ${card.isMatched
                        ? card.matchedBy === "Princess" ? "bg-pink-100/80 border-primary text-primary" : "bg-emerald-100/80 border-emerald-700 text-emerald-800"
                        : `${card.bg} border-primary/40`}`}>
                        <span className="text-2xl drop-shadow-xs">{card.icon}</span>
                        <span className="text-[10px] font-space font-bold mt-0.5 leading-none">
                          {card.label}
                        </span>
                        {card.isMatched && (
                          <span className="absolute bottom-1 right-1 text-[8px] font-bold px-1 rounded-full bg-white/80 shadow-2xs">
                            {card.matchedBy === "Princess" ? "P" : "C"}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Bottom Tip */}
            <div className="text-center py-1">
              <p className="font-space text-[11px] text-text-muted">
                {isCheckingMatch
                  ? "Mengecek kecocokan kartu..."
                  : "Buka 2 kartu yang sama untuk dapat poin! 🃏"}
              </p>
            </div>
          </div>
        ) : (
          /* MODE 1 & 2: DUAL SPLIT ARENA (REACTION & TUG) */
          <div className="flex-1 flex flex-col relative overflow-hidden">
            {/* TOP HALF: PRINCESS ZONE */}
            <div
              onClick={() => {
                if (mode === "reaction") handleReactionTap("Princess");
                else if (mode === "tug") handleTugTap("Princess");
              }}
              className={`flex-1 transition-colors flex flex-col items-center justify-center cursor-pointer active:brightness-95 p-4 relative ${
                mode === "reaction"
                  ? reactionState === "go"
                    ? "bg-[#00e676]/30 active:bg-[#00e676]/45"
                    : reactionState === "ready"
                    ? "bg-red-50 active:bg-red-100"
                    : "bg-pink-50/70"
                  : "bg-pink-50/70 active:bg-pink-100"
              }`}
            >
              {/* Rotate wrapper for Princess */}
              <div
                className={`flex flex-col items-center transition-transform duration-300 pointer-events-none ${
                  isTopFlipped ? "rotate-180" : ""
                }`}
              >
                <span className="font-sora font-extrabold text-2xl tracking-tight text-primary drop-shadow-xs">
                  PRINCESS
                </span>
                <span className="font-space text-xs text-text-muted mt-1 font-medium">
                  {mode === "reaction" ? "Tap saat warna hijau!" : "Spam tap secepatnya! ⚡️"}
                </span>
                {mode === "tug" && (
                  <span className="mt-2 text-2xl font-black text-primary">
                    {Math.round(100 - tugPosition)}%
                  </span>
                )}
              </div>
            </div>

            {/* MIDDLE DIVIDER BAR / STATUS HUB */}
            <div className="min-h-16 bg-white border-y border-primary/20 shrink-0 flex items-center justify-between px-3 z-10 shadow-xs relative">
              {mode === "reaction" ? (
                <>
                  <div className="flex-1 min-w-0 text-center pr-2">
                    <span
                      className={`font-space text-[11px] leading-snug font-bold px-2.5 py-1 rounded-full transition-all inline-block ${
                        reactionState === "go"
                          ? "bg-[#00e676] text-white animate-pulse"
                          : reactionState === "ready"
                          ? "bg-red-500 text-white"
                          : reactionState === "foul"
                          ? "bg-amber-500 text-white"
                          : "bg-gray-100 text-text-main"
                      }`}
                    >
                      {reactionMsg}
                    </span>
                  </div>

                  {(reactionState === "waiting" ||
                    reactionState === "round_over" ||
                    reactionState === "foul") &&
                    !matchWinner && (
                      <button
                        type="button"
                        onClick={startReactionRound}
                        className="shrink-0 py-1.5 px-2.5 rounded-full bg-primary hover:bg-primary-hover text-white font-space text-[11px] font-bold shadow-xs active:scale-95 transition-all"
                      >
                        {reactionState === "waiting" ? "Mulai! ▶" : "Lanjut Ronde ▶"}
                      </button>
                    )}
                </>
              ) : (
                /* Tug of War Center Bar */
                <div className="w-full flex items-center justify-between">
                  <span className="font-space text-xs font-bold text-primary">
                    Princess
                  </span>

                  {!isTugActive ? (
                    <button
                      type="button"
                      onClick={startTugRound}
                      className="py-1 px-4 rounded-full bg-primary hover:bg-primary-hover text-white font-space text-xs font-bold shadow-xs active:scale-95 transition-all"
                    >
                      {tugTimer === 7 ? "Mulai tarik" : "Ronde berikutnya"}
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5 font-space text-xs font-bold bg-gray-100 px-3 py-1 rounded-full">
                      <span>Sisa:</span>
                      <span className="text-primary font-extrabold text-sm">{tugTimer}s</span>
                    </div>
                  )}

                  <span className="font-space text-xs font-bold text-[#002112]">
                    Copilot
                  </span>
                </div>
              )}
            </div>

            {/* TUG OF WAR ROPE INDICATOR OVERLAY */}
            {mode === "tug" && (
              <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 pointer-events-none z-15">
                <div className="relative w-full h-3 bg-gray-200/80 rounded-full border border-black/10 overflow-hidden">
                  <div
                    style={{ width: `${100 - tugPosition}%` }}
                    className="h-full bg-gradient-to-r from-primary to-pink-400 transition-all duration-75"
                  />
                </div>
                {/* Tug Heart Icon Marker */}
                <div
                  style={{ top: "-10px", left: `calc(${tugPosition}% - 14px)` }}
                  className="absolute text-xl transition-all duration-75 drop-shadow-md"
                >
                  💖
                </div>
              </div>
            )}

            {/* BOTTOM HALF: COPILOT ZONE */}
            <div
              onClick={() => {
                if (mode === "reaction") handleReactionTap("Copilot");
                else if (mode === "tug") handleTugTap("Copilot");
              }}
              className={`flex-1 transition-colors flex flex-col items-center justify-center cursor-pointer active:brightness-95 p-4 relative ${
                mode === "reaction"
                  ? reactionState === "go"
                    ? "bg-[#00e676]/30 active:bg-[#00e676]/45"
                    : reactionState === "ready"
                    ? "bg-red-50 active:bg-red-100"
                    : "bg-emerald-50/70"
                  : "bg-emerald-50/70 active:bg-emerald-100"
              }`}
            >
              <div className="flex flex-col items-center pointer-events-none">
                <span className="font-sora font-extrabold text-2xl tracking-tight text-[#002112] drop-shadow-xs">
                  COPILOT
                </span>
                <span className="font-space text-xs text-text-muted mt-1 font-medium">
                  {mode === "reaction" ? "Tap saat warna hijau!" : "Spam tap secepatnya! ⚡️"}
                </span>
                {mode === "tug" && (
                  <span className="mt-2 text-2xl font-black text-[#002112]">
                    {Math.round(tugPosition)}%
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
