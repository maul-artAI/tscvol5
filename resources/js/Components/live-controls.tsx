
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/api";

export const PERIODS = ["1ST HALF", "HALF TIME", "2ND HALF", "FULL TIME"];

/** "17:32" -> "18:32", "17" -> "18" */
export function bumpClock(clock: string): string {
  const m = clock.trim().match(/^(\d+)(?::(\d{1,2}))?$/);
  if (!m) return clock;
  const mm = parseInt(m[1], 10) + 1;
  if (m[2] === undefined) return String(mm);
  return `${mm}:${m[2].padStart(2, "0")}`;
}

export function ScoreStepper({
  label,
  value,
  onChange,
  accent,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  accent?: boolean;
}) {
  const btn =
    "w-11 h-11 rounded-lg text-xl font-bold transition active:scale-95 bg-white/10 hover:bg-white/20";
  return (
    <div className={`rounded-xl border p-3 text-center ${accent ? "border-brand/50 bg-brand/5" : "border-border bg-dark"}`}>
      <div className="text-[11px] font-bold text-muted uppercase truncate mb-2">{label}</div>
      <div className="flex items-center justify-center gap-2">
        <button type="button" className={btn} onClick={() => onChange(Math.max(0, value - 1))} aria-label={`Kurangi ${label}`}>
          −
        </button>
        <span className="font-display italic font-bold text-4xl tabular-nums w-12">{value}</span>
        <button type="button" className={btn} onClick={() => onChange(Math.min(99, value + 1))} aria-label={`Tambah ${label}`}>
          +
        </button>
      </div>
    </div>
  );
}

export function PeriodChips({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {PERIODS.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition ${
            value === p ? "bg-brand text-white live-glow" : "bg-white/10 text-muted hover:text-white"
          }`}
        >
          {p}
        </button>
      ))}
    </div>
  );
}

export function ClockField({ value, onChange, id }: { value: string; onChange: (v: string) => void; id?: string }) {
  return (
    <div className="flex gap-2">
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="17:32"
        className="flex-1 min-w-0 bg-dark border border-border rounded-lg px-3 py-2 text-sm tabular-nums outline-none focus:border-brand"
      />
      <button
        type="button"
        onClick={() => onChange(bumpClock(value || "0"))}
        className="px-3 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-bold transition"
        title="Tambah 1 menit"
      >
        +1&prime;
      </button>
    </div>
  );
}

export function StatusSegment({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const opts = [
    { v: "scheduled", label: "Terjadwal" },
    { v: "live", label: "Live" },
    { v: "finished", label: "Selesai" },
  ];
  return (
    <div className="flex rounded-lg overflow-hidden border border-border text-xs font-bold">
      {opts.map((o) => (
        <button
          key={o.v}
          type="button"
          onClick={() => onChange(o.v)}
          className={`flex-1 py-2 transition ${
            value === o.v ? "bg-brand text-white" : "bg-dark text-muted hover:text-white"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function parseDisplay(display: string): number {
  const m = display.trim().match(/^(\d+)(?::(\d{1,2}))?$/);
  if (!m) return 0;
  return parseInt(m[1], 10) * 60 + parseInt(m[2] || "0", 10);
}

function fmt(total: number): string {
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/**
 * Timer tersinkron backend. Angka yang sama terlihat di semua admin + landing.
 * Detik berjalan lokal agar mulus; basis waktu di-resync tiap data match berubah.
 */
export function MatchTimer({
  matchId,
  display,
  running,
  ended,
  maxSeconds = 1200,
  onChanged,
}: {
  matchId: number;
  display: string;
  running: boolean;
  ended: boolean;
  maxSeconds?: number;
  onChanged: () => void;
}) {
  const base = useMemo(() => parseDisplay(display), [display, matchId]);
  const [tick, setTick] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setTick(0);
  }, [display, running, matchId]);

  useEffect(() => {
    if (!running || ended) return;
    const t = setInterval(() => setTick((v) => v + 1), 1000);
    return () => clearInterval(t);
  }, [running, ended, matchId]);

  const total = Math.min(base + (running && !ended ? tick : 0), maxSeconds);

  async function call(action: "start" | "pause" | "reset") {
    setBusy(true);
    try {
      await apiFetch(`/matches/${matchId}/clock/${action}`, { method: "POST" });
      onChanged();
    } catch {
      /* pesan ditangani halaman induk via refresh berikutnya */
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-dark p-3">
      <div className="flex items-center justify-between mb-2">
        <span className={`font-display italic font-bold text-3xl tabular-nums ${running && !ended ? "text-white" : "text-muted"}`}>
          {fmt(total)}
        </span>
        {running && !ended ? (
          <span className="text-[10px] font-bold bg-brand px-2 py-0.5 rounded live-glow animate-pulse">JALAN</span>
        ) : ended ? (
          <span className="text-[10px] font-bold bg-white/10 px-2 py-0.5 rounded text-muted">HABIS</span>
        ) : (
          <span className="text-[10px] font-bold bg-white/10 px-2 py-0.5 rounded text-muted">BERHENTI</span>
        )}
      </div>
      <div className="flex gap-2">
        {running ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => call("pause")}
            className="flex-1 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold transition disabled:opacity-40"
          >
            <i className="fa-solid fa-pause mr-1"></i> Pause
          </button>
        ) : (
          <button
            type="button"
            disabled={busy || ended}
            onClick={() => call("start")}
            className="flex-1 py-2 rounded-lg bg-brand hover:bg-red-700 text-xs font-bold transition disabled:opacity-40 live-glow"
          >
            <i className="fa-solid fa-play mr-1"></i> Start
          </button>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={() => call("reset")}
          className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold transition disabled:opacity-40"
          title="Nol-kan timer"
        >
          <i className="fa-solid fa-rotate-left"></i>
        </button>
      </div>
    </div>
  );
}
