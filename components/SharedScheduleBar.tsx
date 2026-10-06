"use client";

import { useState } from "react";
import { Check, Link2, Cloud, RefreshCw, X } from "lucide-react";
import type { useSharedItinerary } from "@/lib/use-shared-itinerary";

export function SharedScheduleBar({ sync }: { sync: ReturnType<typeof useSharedItinerary> }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const busy = sync.phase === "loading";
  const label = !sync.access ? "Jadwal perangkat ini"
    : sync.phase === "synced" ? "Jadwal bersama"
    : sync.phase === "pending" ? "Menyimpan perubahan…"
    : sync.phase === "loading" ? "Menghubungkan jadwal…"
    : sync.phase === "conflict" ? "Ada perubahan bersamaan" : "Belum tersinkron";
  const url = typeof window !== "undefined" ? sync.shareUrl() : null;

  async function copy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setCopyError(false);
    } catch { setCopyError(true); }
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 pt-3 font-space text-xs">
      <div className="flex items-center justify-between gap-2 text-text-muted">
        <span role="status" className="flex min-w-0 items-center gap-1.5">
          <Cloud aria-hidden="true" className={`h-3.5 w-3.5 shrink-0 ${sync.phase === "synced" ? "text-emerald-600" : "text-text-muted"}`} />
          {label}
        </span>
        <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open}
          className="flex min-h-8 shrink-0 items-center gap-1 rounded-lg px-2 font-semibold text-primary hover:bg-primary/5">
          <Link2 size={13} aria-hidden="true" /> {sync.access ? "Link jadwal" : "Bagikan"}
        </button>
      </div>

      {(open || sync.error || sync.storageError) && (
        <section aria-label="Berbagi jadwal" className="mt-2 rounded-2xl border border-primary/15 bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="font-sora text-sm font-semibold text-text-main">Jadwal bersama</h2>
            {open && <button type="button" aria-label="Tutup pengaturan berbagi" onClick={() => setOpen(false)} className="rounded-lg p-1.5 hover:bg-gray-50"><X size={15} /></button>}
          </div>
          {sync.error && <p role="alert" className="mb-3 text-amber-800">{sync.error}</p>}
          {sync.storageError && <p role="alert" className="mb-3 text-amber-800">{sync.storageError}</p>}
          {!sync.access ? (
            <>
              <p className="leading-relaxed text-text-muted">Bagikan jadwal dari perangkat ini. Pemegang link dapat melihat dan mengedit jadwal yang sama.</p>
              {sync.connectionReady === null && <p role="status" className="mt-2 text-text-muted">Memeriksa koneksi Supabase…</p>}
              {sync.connectionError && <p role="status" className="mt-2 leading-relaxed text-amber-800">{sync.connectionError} Rencana tetap tersimpan di perangkat ini.</p>}
              {sync.connectionReady === false && <button type="button" onClick={() => void sync.checkConnection()} className="mt-2 inline-flex min-h-9 items-center gap-1.5 text-primary"><RefreshCw size={13} /> Periksa koneksi lagi</button>}
              <button type="button" disabled={!sync.ready || busy || sync.connectionReady !== true} onClick={() => void sync.share()}
                className="mt-3 min-h-10 rounded-xl bg-primary px-4 font-semibold text-white disabled:opacity-50">
                {busy ? "Membuat link…" : "Aktifkan jadwal bersama"}
              </button>
            </>
          ) : (
            <>
              <p className="leading-relaxed text-text-muted">Bagikan link ini ke pasanganmu. Perubahan diperbarui setiap beberapa detik saat halaman terbuka. Pemegang link juga dapat melihat dan mengedit bersama.</p>
              <div className="mt-3 flex gap-2">
                <input readOnly aria-label="Link jadwal bersama" value={url || ""} onFocus={(event) => event.target.select()}
                  className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs" />
                <button type="button" onClick={() => void copy()} className="min-h-10 shrink-0 rounded-xl bg-primary px-3 font-semibold text-white">
                  {copied ? <><Check size={14} className="inline" /> Disalin</> : "Salin"}
                </button>
              </div>
              {copyError && <p role="status" className="mt-2 text-text-muted">Pilih dan salin link di atas secara manual.</p>}
            </>
          )}
          {sync.phase === "conflict" && (
            <div className="mt-3 border-t border-primary/10 pt-3">
              <p className="text-text-muted">Perangkat lain menyimpan lebih dulu. Salinan perubahanmu akan diunduh sebelum memuat jadwal terbaru. Setelah itu, ulangi perubahan yang masih diperlukan.</p>
              <button type="button" onClick={() => void sync.useRemote()} className="mt-2 min-h-10 rounded-xl bg-text-main px-3 font-semibold text-white">Simpan salinan & muat versi terbaru</button>
            </div>
          )}
          {sync.phase === "error" && sync.access && <button type="button" onClick={() => void sync.retry()} className="mt-3 inline-flex min-h-9 items-center gap-1.5 text-primary"><RefreshCw size={13} /> Coba hubungkan lagi</button>}
          <button type="button" onClick={sync.download} className="mt-3 block min-h-8 text-text-muted underline underline-offset-4">Unduh cadangan jadwal</button>
          {sync.access && <button type="button" onClick={sync.disconnect} className="mt-1 block min-h-8 text-text-muted underline underline-offset-4">Kembali ke jadwal lokal</button>}
        </section>
      )}
    </div>
  );
}
