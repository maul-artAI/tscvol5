
import { useMemo, useState } from "react";
import type { TournamentMatch } from "../../lib/api";
import PublicLayout from "../../Layouts/PublicLayout";
import Reveal from "../../Components/Reveal";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

function fmtDay(dateStr: string): string {
  const d = new Date(dateStr.length <= 10 ? `${dateStr}T00:00:00` : dateStr);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export default function JadwalPage({ matches }: { matches: TournamentMatch[] }) {
  const [cat, setCat] = useState<"SMA" | "SMP">("SMA");
  const dates = useMemo(
    () => [...new Set(matches.map((m) => (m.match_date || "").slice(0, 10)).filter(Boolean))].sort(),
    [matches]
  );
  const [date, setDate] = useState(dates[0] || "");
  const shown = matches.filter(
    (m) => m.category === cat && (!date || (m.match_date || "").slice(0, 10) === date)
  );

  return (
    <PublicLayout>
    <main className="min-h-screen bg-dark text-white">
      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Reveal>
        <h1 className="font-display italic font-bold text-4xl md:text-5xl uppercase mt-3">
          Jadwal <span className="text-brand">Pertandingan</span>
        </h1>
        </Reveal>

        <Reveal delay={120}>
        <div className="flex flex-wrap gap-2 mt-6">
          {(["SMA", "SMP"] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`px-5 py-2 rounded text-sm font-bold uppercase transition ${
                cat === c ? "bg-brand text-white live-glow" : "bg-surface border border-border text-muted hover:text-white"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="flex gap-2 mt-4 mb-6 overflow-x-auto pb-1 hide-scrollbar">
          {dates.map((d) => (
            <button
              key={d}
              onClick={() => setDate(d)}
              className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition tabular-nums ${
                date === d ? "bg-brand text-white" : "bg-surface border border-border text-muted hover:text-white"
              }`}
            >
              {fmtDay(d)}
            </button>
          ))}
        </div>

        {shown.length === 0 ? (
          <p className="text-sm text-muted bg-surface border border-border rounded-xl p-6 text-center">
            Tidak ada jadwal pada tanggal ini.
          </p>
        ) : (
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            {shown.map((m) => (
              <div key={m.id} className="flex items-center gap-3 px-4 py-3 border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition">
                <span className="text-xs text-muted tabular-nums w-12 shrink-0">{(m.kickoff || "").slice(0, 5)}</span>
                <span className="text-[10px] font-bold text-muted uppercase w-14 shrink-0 hidden sm:block">{m.lapangan}</span>
                <div className="flex-1 min-w-0 text-sm">
                  <span className="font-medium">{m.team1?.short_name || m.team1?.name || "TBD"}</span>
                  <span className="text-muted mx-2 text-xs">
                    {m.status === "finished" ? `${m.team1_score} - ${m.team2_score}` : "vs"}
                  </span>
                  <span className="font-medium text-gray-300">{m.team2?.short_name || m.team2?.name || "TBD"}</span>
                  <span className="block text-[11px] text-muted font-normal truncate">{m.stage}</span>
                </div>
                {m.status === "live" ? (
                  <span className="text-[10px] font-bold bg-brand px-2 py-1 rounded live-glow shrink-0">
                    LIVE {m.clock_display || m.clock}
                  </span>
                ) : m.status === "finished" ? (
                  <span className="text-[10px] font-bold text-muted shrink-0">SELESAI</span>
                ) : (
                  <span className="text-[10px] font-bold bg-white/10 text-gray-300 px-2 py-1 rounded shrink-0">UPCOMING</span>
                )}
              </div>
            ))}
          </div>
        )}
        </Reveal>
      </div>
    </main>
    </PublicLayout>
  );
}
