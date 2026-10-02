import { useEffect, useState } from "react";
import { Link } from "@inertiajs/react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { apiFetch, type TournamentMatch } from "../../lib/api";
import AdminLayout from "../../Layouts/AdminLayout";
import DailyMatchTimelineHeatmap, { type HeatMatch } from "../../Components/DailyMatchTimelineHeatmap";

type Stats = { teams: number; live: number; scheduled: number; finished?: number; news: number };
type TopTeam = { name: string; category?: string; goals: number };

const CARD = "bg-[#141414] border border-white/5 rounded-2xl p-5";
const TOOLTIP = {
  contentStyle: { backgroundColor: "#0a0a0a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 },
  labelStyle: { color: "#fff" },
  itemStyle: { color: "#fff" },
};

export default function AdminDashboard({
  initialStats,
  initialLive,
  initialTopTeams,
  initialHeat,
}: {
  initialStats?: Stats;
  initialLive?: TournamentMatch[];
  initialTopTeams?: TopTeam[];
  initialHeat?: HeatMatch[];
}) {
  const [stats, setStats] = useState<Stats>(initialStats ?? { teams: 0, live: 0, scheduled: 0, news: 0 });
  const [live, setLive] = useState<TournamentMatch[]>(initialLive ?? []);
  const [topTeams, setTopTeams] = useState<TopTeam[]>(initialTopTeams ?? []);
  const [heat] = useState<HeatMatch[]>(initialHeat ?? []);

  useEffect(() => {
    if (initialStats !== undefined) return;
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

  const finished = stats.finished ?? 0;
  const total = stats.live + stats.scheduled + finished;
  const donut = [
    { name: "Terjadwal", value: stats.scheduled, color: "#64748B" },
    { name: "Live", value: stats.live, color: "#F59E0B" },
    { name: "Selesai", value: finished, color: "#DC2626" },
  ];

  return (
    <AdminLayout>
    <div>
      <h1 className="font-display italic font-bold text-2xl mb-1">Dashboard</h1>
      <p className="text-sm text-muted mb-6">Ringkasan turnamen hari ini.</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* Kartu 1: Sedang live */}
        <div className={CARD}>
          <h2 className="font-bold text-sm uppercase tracking-wide mb-1">Sedang Live</h2>
          <p className="text-[11px] text-muted mb-3">{live.length} pertandingan berlangsung</p>
          {live.length === 0 ? (
            <div className="flex items-center gap-2 text-xs text-muted py-4">
              <span className="w-2 h-2 rounded-full bg-neutral-600"></span>
              Tidak ada pertandingan live saat ini.
            </div>
          ) : (
            <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
              {live.map((m) => (
                <Link
                  key={m.id}
                  href={`/admin/matches/${m.id}`}
                  className="bg-dark border border-border rounded-xl p-3 hover:border-brand transition"
                >
                  <div className="text-[11px] text-muted uppercase mb-1.5 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                    {m.lapangan} • {m.stage}
                  </div>
                  <div className="font-display italic font-bold text-lg tabular-nums leading-tight">
                    {m.team1?.short_name || m.team1?.name || "?"} {m.team1_score} - {m.team2_score} {m.team2?.short_name || m.team2?.name || "?"}
                  </div>
                  <div className="text-[11px] text-brand font-bold mt-1 tabular-nums">
                    {m.period} • {m.clock_display || m.clock}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Kartu 2: Donut progres */}
        <div className={CARD}>
          <h2 className="font-bold text-sm uppercase tracking-wide mb-1">Progres Status Laga</h2>
          <p className="text-[11px] text-muted mb-1">Distribusi seluruh pertandingan</p>
          {total === 0 ? (
            <p className="text-xs text-muted py-8 text-center">Belum ada data laga.</p>
          ) : (
            <ResponsiveContainer width="100%" height={230}>
              <PieChart>
                <Tooltip {...TOOLTIP} formatter={(value, name) => [`${value} laga`, name]} />
                <Legend verticalAlign="bottom" height={24} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Pie data={donut} dataKey="value" nameKey="name" innerRadius={62} outerRadius={88} paddingAngle={3} strokeWidth={0}>
                  {donut.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Pie>
                <text x="50%" y="46%" textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize={26} fontWeight={800}>
                  {total}
                </text>
                <text x="50%" y="56%" textAnchor="middle" dominantBaseline="middle" fill="#71717a" fontSize={11}>
                  Total Laga
                </text>
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Kartu 3: Top skor tim */}
        <div className={CARD}>
          <h2 className="font-bold text-sm uppercase tracking-wide mb-1">Top Skor Tim (Gol Terbanyak)</h2>
          <p className="text-[11px] text-muted mb-1">5 tim terproduktif semua kategori</p>
          {topTeams.length === 0 ? (
            <p className="text-xs text-muted py-8 text-center">Belum ada gol tercatat.</p>
          ) : (
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={topTeams} layout="vertical" margin={{ top: 0, right: 36, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={92} tick={{ fill: "#d4d4d8", fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip {...TOOLTIP} formatter={(value) => [`${value} gol`, "Gol"]} />
                <Bar dataKey="goals" fill="#DC2626" radius={[0, 6, 6, 0]} barSize={18}>
                  <LabelList dataKey="goals" position="right" fill="#fff" fontSize={11} fontWeight={700} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Kartu 4: Heatmap linimasa laga per hari */}
      <DailyMatchTimelineHeatmap matches={heat} />
    </div>
    </AdminLayout>
  );
}
