
import { useEffect, useState } from "react";
import { Link } from "@inertiajs/react";
import { apiFetch, type TournamentMatch } from "../../lib/api";
import AdminLayout from "../../Layouts/AdminLayout";

export default function AdminDashboard() {
  const [stats, setStats] = useState({ teams: 0, live: 0, scheduled: 0, news: 0 });
  const [live, setLive] = useState<TournamentMatch[]>([]);

  useEffect(() => {
    (async () => {
      const [teams, liveM, sched, news] = await Promise.all([
        apiFetch<{ data: unknown[] }>("/teams?active_only=0"),
        apiFetch<{ data: TournamentMatch[] }>("/matches/live"),
        apiFetch<{ data: unknown[] }>("/matches?status=scheduled"),
        apiFetch<{ total: number }>("/news?per_page=1"),
      ]);
      setStats({
        teams: teams.data.length,
        live: liveM.data.length,
        scheduled: sched.data.length,
        news: news.total,
      });
      setLive(liveM.data);
    })().catch(() => {});
  }, []);

  const cards = [
    { label: "Total Tim", value: stats.teams, icon: "fa-solid fa-users", href: "/admin/teams" },
    { label: "Live Sekarang", value: stats.live, icon: "fa-solid fa-tower-broadcast", href: "/admin/matches" },
    { label: "Terjadwal", value: stats.scheduled, icon: "fa-regular fa-calendar-days", href: "/admin/matches" },
    { label: "Berita", value: stats.news, icon: "fa-regular fa-newspaper", href: "/admin/news" },
  ];

  return (
    <AdminLayout>
    <div>
      <h1 className="font-display italic font-bold text-2xl mb-1">Dashboard</h1>
      <p className="text-sm text-muted mb-6">Ringkasan turnamen hari ini.</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="bg-surface border border-border rounded-xl p-4 hover:border-brand transition"
          >
            <i className={`${c.icon} text-brand text-xl`}></i>
            <div className="font-display italic font-bold text-3xl mt-2 tabular-nums">{c.value}</div>
            <div className="text-xs text-muted">{c.label}</div>
          </Link>
        ))}
      </div>

      <h2 className="font-bold text-sm uppercase tracking-wide mb-3">Sedang Live</h2>
      {live.length === 0 ? (
        <p className="text-sm text-muted">Tidak ada pertandingan live.</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {live.map((m) => (
            <Link
              key={m.id}
              href={`/admin/matches/${m.id}`}
              className="bg-surface border border-border rounded-xl p-4 hover:border-brand transition"
            >
              <div className="text-[11px] text-muted uppercase mb-2">
                {m.lapangan} • {m.stage}
              </div>
              <div className="font-display italic font-bold text-2xl tabular-nums">
                {m.team1?.name} {m.team1_score} - {m.team2_score} {m.team2?.name}
              </div>
              <div className="text-xs text-brand font-bold mt-1 tabular-nums">
                {m.period} • {m.clock}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
    </AdminLayout>
  );
}