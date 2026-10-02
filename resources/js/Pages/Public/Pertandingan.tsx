
import BackButton from "../../Components/BackButton";
import PublicLayout from "../../Layouts/PublicLayout";
import type { MatchEvent, TournamentMatch } from "../../lib/api";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

function EvIcon({ type }: { type: string }) {
  if (type === "goal" || type === "shootout_goal") return <i className="fa-regular fa-futbol text-white"></i>;
  if (type === "wo_call") return <i className="fa-solid fa-bullhorn text-amber-400"></i>;
  if (type === "own_goal") return <i className="fa-regular fa-futbol text-amber-400"></i>;
  if (type === "shootout_miss") return <i className="fa-solid fa-circle-xmark text-muted"></i>;
  if (type === "yellow_card") return <i className="fa-solid fa-square text-yellow-400"></i>;
  if (type === "foul") return <i className="fa-solid fa-whistle text-gray-400"></i>;
  if (type === "red_card") return <i className="fa-solid fa-square text-red-500"></i>;
  return <i className="fa-solid fa-circle text-muted"></i>;
}

const TYPE_LABEL: Record<string, string> = { goal: "Gol", own_goal: "Own Goal", shootout_goal: "Gol Penalti", shootout_miss: "Penalti Gagal", wo_call: "Panggilan WO", yellow_card: "Kartu kuning", red_card: "Kartu merah", foul: "Pelanggaran" };

export default function PertandinganDetailPage({ match: m }: { match: TournamentMatch }) {

  const events = [...(m.events || [])].sort((a, b) => a.minute - b.minute);
  const decided = m.status === "finished" && m.team1_score !== m.team2_score;

  return (
    <PublicLayout>
    <main className="min-h-screen bg-dark text-white">
      <div className="max-w-[760px] mx-auto px-4 sm:px-6 py-8">
        <BackButton href="/#skor" label="Semua skor" />

        {/* Hero skor */}
        <div className="bg-surface border border-border rounded-xl p-5 mt-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-muted">{m.stage || m.category} • {m.lapangan}</span>
            {m.status === "live" ? (
              <span className="tabular-nums text-[11px] font-bold bg-brand/15 text-brand border border-brand/40 px-2.5 py-1 rounded-full live-glow">
                ● {m.clock_display || m.clock || m.period}
              </span>
            ) : m.status === "finished" ? (
              <span className="text-[11px] font-bold text-muted">SELESAI</span>
            ) : (
              <span className="text-[11px] text-muted tabular-nums">
                {(m.match_date || "").slice(0, 10)} {(m.kickoff || "").slice(0, 5)}
              </span>
            )}
          </div>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center">
            <div>
              <div className="flex justify-center mb-2">
                {m.team1?.logo_url ? (
                  <img src={m.team1.logo_url} alt="" className="w-14 h-14 rounded-full object-cover bg-white/10" />
                ) : (
                  <span className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center text-muted text-xl">
                    <i className="fa-solid fa-shield-halved"></i>
                  </span>
                )}
              </div>
              <p className="text-sm font-medium leading-tight">{m.team1?.name || "TBD"}</p>
            </div>
            <p className="font-display italic font-bold text-5xl tabular-nums whitespace-nowrap">
              {m.team1_score} - {m.team2_score}
            </p>
            <div>
              <div className="flex justify-center mb-2">
                {m.team2?.logo_url ? (
                  <img src={m.team2.logo_url} alt="" className="w-14 h-14 rounded-full object-cover bg-white/10" />
                ) : (
                  <span className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center text-muted text-xl">
                    <i className="fa-solid fa-shield-halved"></i>
                  </span>
                )}
              </div>
              <p className="text-sm font-medium leading-tight">{m.team2?.name || "TBD"}</p>
            </div>
          </div>
        </div>

        {/* Summary timeline */}
        <h2 className="font-bold text-sm uppercase tracking-wide mt-6 mb-2 border-b border-white/10 pb-2">
          Summary
        </h2>
        {/* Summary per tim */}
        {events.length === 0 ? (
          <p className="text-xs text-muted py-4">Belum ada gol/kartu tercatat.</p>
        ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {(
            [
              ["team1", m.team1],
              ["team2", m.team2],
            ] as const
          ).map(([side, team]) => (
            <div key={side} className="bg-surface border border-border rounded-xl px-4 py-2">
              <p className="text-[11px] font-bold text-muted uppercase py-2 border-b border-white/5">
                {team?.short_name || team?.name || "TBD"}
              </p>
              {events.filter((e: MatchEvent) => e.team_side === side).length === 0 ? (
                <p className="text-[11px] text-muted py-2">—</p>
              ) : (
                events
                  .filter((e: MatchEvent) => e.team_side === side)
                  .map((e: MatchEvent) => (
                    <div key={e.id} className="flex items-center gap-2 py-2 border-b border-white/5 last:border-0 text-[13px]">
                      <span className="tabular-nums text-muted text-xs w-8 shrink-0">{e.minute}&prime;</span>
                      <EvIcon type={e.type} />
                      <span className="flex-1 min-w-0">
                        <span className="font-medium">{e.player_name}</span>
                        <span className="block text-[11px] text-muted">
                          {TYPE_LABEL[e.type]}{e.assist_name ? ` • Ast: ${e.assist_name}` : ""}
                        </span>
                      </span>
                    </div>
                  ))
              )}
            </div>
          ))}
        </div>
        )}

        {/* Info */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 text-center">
          {[
            ["Tanggal", (m.match_date || "").slice(0, 10)],
            ["Kickoff", (m.kickoff || "").slice(0, 5) || "-"],
            ["Venue", m.venue || "-"],
            ["Babak", m.period || STATUS_LABEL[m.status] || m.status],
          ].map(([k, v]) => (
            <div key={k} className="bg-surface border border-border rounded-xl px-2 py-3">
              <div className="text-[10px] font-bold text-muted uppercase">{k}</div>
              <div className="text-xs font-semibold mt-1 tabular-nums">{v}</div>
            </div>
          ))}
        </div>
      </div>
    </main>
    </PublicLayout>
  );
}

const STATUS_LABEL: Record<string, string> = { scheduled: "Terjadwal", live: "Live", finished: "Selesai" };
