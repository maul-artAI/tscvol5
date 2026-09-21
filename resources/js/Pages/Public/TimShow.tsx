
import BackButton from "../../Components/BackButton";
import PublicLayout from "../../Layouts/PublicLayout";
import type { Team, TournamentMatch } from "../../lib/api";

type Player = {
  id: number;
  name: string;
  jersey_number?: number | null;
  position?: string | null;
  photo_url?: string | null;
};

type TeamDetail = Team & { players?: Player[] };

export default function TimDetailPage({ team, matches }: { team: TeamDetail; matches: TournamentMatch[] }) {
  let w = 0, d = 0, l = 0;
  matches
    .filter((m) => m.status === "finished")
    .forEach((m) => {
      const mine = m.team1_id === team.id ? m.team1_score : m.team2_score;
      const theirs = m.team1_id === team.id ? m.team2_score : m.team1_score;
      if (mine > theirs) w++;
      else if (mine === theirs) d++;
      else l++;
    });

  const upcoming = matches.filter((m) => m.status !== "finished").slice(0, 5);

  return (
    <PublicLayout>
    <main className="min-h-screen bg-dark text-white">
      <div className="max-w-[900px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <BackButton href="/tim" label="Semua tim" />

        <div className="flex items-center gap-4 mt-4">
          {team.logo_url ? (
            <img src={team.logo_url} alt="" className="w-20 h-20 rounded-2xl object-cover bg-white/10" />
          ) : (
            <span className="w-20 h-20 rounded-2xl bg-white/10 flex items-center justify-center text-muted text-3xl">
              <i className="fa-solid fa-shield-halved"></i>
            </span>
          )}
          <div>
            <h1 className="font-display italic font-bold text-3xl md:text-4xl uppercase">{team.name}</h1>
            <p className="text-sm text-muted mt-1">
              {team.category} • {team.group_name || ""} • Rekor {w}-{d}-{l}
            </p>
          </div>
        </div>
        {team.description && <p className="text-sm text-gray-300 mt-4 leading-relaxed">{team.description}</p>}

        <h2 className="font-display italic font-bold text-xl uppercase mt-8 mb-3">
          <span className="text-brand">●</span> Skuad ({team.players?.length || 0})
        </h2>
        {(team.players || []).length === 0 ? (
          <p className="text-sm text-muted">Skuad belum diumumkan.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {team.players!.map((p) => (
              <div key={p.id} className="bg-surface border border-border rounded-xl p-3 text-center">
                {p.photo_url ? (
                  <img src={p.photo_url} alt="" className="w-14 h-14 rounded-full object-cover bg-white/10 mx-auto mb-2" />
                ) : (
                  <span className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center text-muted mx-auto mb-2 font-display italic font-bold tabular-nums">
                    {p.jersey_number || <i className="fa-solid fa-user text-sm"></i>}
                  </span>
                )}
                <div className="font-bold text-sm leading-tight">{p.name}</div>
                <div className="text-[11px] text-muted mt-0.5">
                  {[p.jersey_number ? `#${p.jersey_number}` : "", p.position || ""].filter(Boolean).join(" • ")}
                </div>
              </div>
            ))}
          </div>
        )}

        <h2 className="font-display italic font-bold text-xl uppercase mt-8 mb-3">
          <span className="text-brand">●</span> Jadwal Berikutnya
        </h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-muted">Tidak ada jadwal tersisa.</p>
        ) : (
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            {upcoming.map((m) => {
              const rival = m.team1_id === team.id ? m.team2 : m.team1;
              return (
                <div key={m.id} className="flex items-center gap-3 px-4 py-3 border-b border-white/5 last:border-0 text-sm">
                  <span className="text-xs text-muted tabular-nums w-24 shrink-0">
                    {m.match_date?.slice(0, 10)} {(m.kickoff || "").slice(0, 5)}
                  </span>
                  <span className="flex-1 font-medium">
                    vs {rival?.name || "TBD"}
                    <span className="block text-[11px] text-muted font-normal">{m.lapangan} • {m.stage}</span>
                  </span>
                  {m.status === "live" ? (
                    <span className="text-[10px] font-bold bg-brand px-2 py-1 rounded live-glow">LIVE</span>
                  ) : (
                    <span className="text-[10px] font-bold text-muted">UPCOMING</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
    </PublicLayout>
  );
}
