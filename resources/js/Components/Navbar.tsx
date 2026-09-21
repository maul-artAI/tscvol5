
import { useState } from "react";
import type { StandingRow, TournamentMatch } from "../lib/api";

const MOBILE_HREF: Record<string, string> = {
  BERANDA: "/",
  "LIVE SCORE": "/#skor",
  JADWAL: "/jadwal",
  BAGAN: "/bagan",
  KLASEMEN: "/klasemen",
  TIM: "/tim",
  STATISTIK: "/statistik",
  BERITA: "/berita",
  TENTANG: "/tentang",
};

const MONTHS_ID = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

function fmtDayMonth(dateStr?: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr.length <= 10 ? `${dateStr}T00:00:00` : dateStr);
  if (isNaN(+d)) return dateStr;
  return `${d.getDate()} ${MONTHS_ID[d.getMonth()]} ${d.getFullYear()}`;
}

function shortTeam(name?: string | null, short?: string | null): string {
  return short || (name || "").replace(/Makassar/i, "").trim();
}

function MegaMenuJadwal({ schedule }: { schedule: TournamentMatch[] }) {
  const dates = [...new Set(schedule.map((m) => (m.match_date || "").slice(0, 10)).filter(Boolean))].slice(0, 3);

  return (
    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-[100]">
      {/* Hover Bridge (mencegah dropdown hilang saat kursor turun) */}
      <div className="absolute -top-4 left-0 w-full h-4 bg-transparent"></div>
      <div className="w-[500px] bg-dark/95 backdrop-blur-xl border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between bg-surface/50">
          <h2 className="font-bold flex items-center gap-2 tracking-wide uppercase">
            <i className="fa-regular fa-calendar-check text-brand"></i> JADWAL PERTANDINGAN
          </h2>
          <a href="#" className="text-xs text-muted hover:text-white transition">
            Lihat Semua <i className="fa-solid fa-arrow-right"></i>
          </a>
        </div>
        <div className="flex overflow-x-auto border-b border-border text-sm font-semibold hide-scrollbar bg-surface/30">
          {dates.length === 0 && (
            <div className="px-6 py-3 bg-brand text-white whitespace-nowrap text-center">Hari Ini</div>
          )}
          {dates.map((d, i) => (
            <div
              key={d}
              className={`px-6 py-3 whitespace-nowrap text-center cursor-pointer ${
                i === 0
                  ? "bg-brand text-white"
                  : "text-muted hover:text-white hover:bg-white/10 flex items-center justify-center transition"
              }`}
            >
              {i === 0 ? (
                <>Hari Ini<br /><span className="text-[10px] font-normal">{fmtDayMonth(d)}</span></>
              ) : (
                fmtDayMonth(d)
              )}
            </div>
          ))}
        </div>
        <div className="p-2 overflow-y-auto max-h-[350px]">
          <table className="w-full text-sm tabular-nums">
            <tbody className="divide-y divide-border/50">
              {schedule.length === 0 && (
                <tr>
                  <td className="py-4 px-2 text-center text-muted text-xs">Belum ada jadwal.</td>
                </tr>
              )}
              {schedule.map((m) => (
                <tr key={m.id} className="hover:bg-white/5 transition">
                  <td className="py-3 px-2 text-muted font-medium w-16 text-center">{(m.kickoff || "").slice(0, 5)}</td>
                  <td className="py-3 px-2 font-bold text-xs uppercase w-12 text-center text-gray-400">{m.category}</td>
                  <td className="py-3 px-2 text-xs text-muted w-14">{(m.lapangan || "").replace("Lapangan", "Lap.")}</td>
                  <td className="py-3 px-2 text-right font-medium">{shortTeam(m.team1?.name, m.team1?.short_name)}</td>
                  <td className="py-3 px-2 text-center text-muted text-xs w-8">
                    {m.status === "finished" ? `${m.team1_score}-${m.team2_score}` : "vs"}
                  </td>
                  <td className="py-3 px-2 text-left font-medium text-gray-400">{shortTeam(m.team2?.name, m.team2?.short_name)}</td>
                  <td className="py-3 px-2 text-right">
                    {m.status === "live" ? (
                      <span className="bg-brand text-white text-[10px] px-2 py-1 rounded font-bold uppercase live-glow">Live</span>
                    ) : m.status === "finished" ? (
                      <span className="bg-[#27272a] text-gray-300 text-[10px] px-2 py-1 rounded font-bold uppercase">FT</span>
                    ) : (
                      <span className="bg-[#27272a] text-gray-300 text-[10px] px-2 py-1 rounded font-bold uppercase">Upcoming</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const DOTS = ["bg-red-400/20", "bg-blue-400/20", "bg-white/10"];

function fmtGD(v: number): string {
  return v > 0 ? `+${v}` : `${v}`;
}

function MegaMenuKlasemen({ standings }: { standings: StandingRow[] }) {
  return (
    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-[100]">
      <div className="absolute -top-4 left-0 w-full h-4 bg-transparent"></div>
      <div className="w-[550px] bg-dark/95 backdrop-blur-xl border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex">
          <button className="flex-1 py-3 bg-brand text-white font-bold text-sm flex items-center justify-center gap-2 uppercase tracking-wide">
            <i className="fa-solid fa-trophy"></i> KLASEMEN SMA
          </button>
          <button className="flex-1 py-3 bg-surface/50 text-muted hover:text-white hover:bg-white/5 font-bold text-sm flex items-center justify-center gap-2 uppercase tracking-wide transition border-b border-border">
            <i className="fa-solid fa-medal"></i> KLASEMEN SMP
          </button>
        </div>
        <div className="p-2 overflow-x-auto bg-surface/30">
          <table className="w-full text-sm tabular-nums">
            <thead>
              <tr className="text-muted text-xs border-b border-border/50 uppercase">
                <th className="py-2 px-2 text-center w-8">#</th>
                <th className="py-2 px-2 text-left">Tim</th>
                <th className="py-2 px-1 text-center w-8" title="Main">M</th>
                <th className="py-2 px-1 text-center w-8" title="Menang">M</th>
                <th className="py-2 px-1 text-center w-8" title="Seri">S</th>
                <th className="py-2 px-1 text-center w-8" title="Kalah">K</th>
                <th className="py-2 px-1 text-center w-10" title="Goal Difference">GD</th>
                <th className="py-2 px-2 text-center w-10 font-bold text-white">PTS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {standings.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-4 px-2 text-center text-muted text-xs">Belum ada data klasemen.</td>
                </tr>
              )}
              {standings.map((r) => (
                <tr key={r.position} className="hover:bg-white/5 transition">
                  <td className={`py-2.5 px-2 text-center font-bold ${r.position === 1 ? "text-brand" : ""}`}>{r.position}</td>
                  <td className="py-2.5 px-2 font-medium flex items-center gap-2">
                    {r.team.logo_url ? (
                      <img src={r.team.logo_url} alt="" className="w-4 h-4 rounded-full object-cover" />
                    ) : (
                      <div className={`w-4 h-4 rounded-full ${DOTS[(r.position - 1) % DOTS.length]}`}></div>
                    )}
                    {shortTeam(r.team.name, r.team.short_name)}
                  </td>
                  <td className="py-2.5 px-1 text-center text-muted">{r.played}</td>
                  <td className="py-2.5 px-1 text-center text-muted">{r.won}</td>
                  <td className="py-2.5 px-1 text-center text-muted">{r.drawn}</td>
                  <td className="py-2.5 px-1 text-center text-muted">{r.lost}</td>
                  <td className="py-2.5 px-1 text-center text-green-400">{fmtGD(r.goal_difference)}</td>
                  <td className="py-2.5 px-2 text-center font-bold">{r.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-2 text-center">
            <a href="#" className="text-xs text-muted hover:text-white transition inline-block py-2">
              Lihat Klasemen Lengkap <i className="fa-solid fa-arrow-right"></i>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

type Props = {
  schedule?: TournamentMatch[];
  standings?: StandingRow[];
};

export default function Navbar({ schedule = [], standings = [] }: Props) {
  const [mobile, setMobile] = useState(false);

  return (
    <nav className="relative flex items-center justify-between py-6 border-b border-white/10">
      {/* Logo Area */}
      <div className="flex items-center gap-3">
        <img src="/tsclogo.png" alt="Telkom School Futsal Cup" className="w-12 h-12 rounded-lg object-cover shadow-lg" />
        <div className="leading-tight">
          <div className="font-display font-bold text-xl italic tracking-wide">TELKOM SCHOOL</div>
          <div className="text-brand text-xs font-bold tracking-widest">FUTSAL CUP</div>
        </div>
      </div>

      {/* Desktop Nav Links */}
      <div className="hidden lg:flex items-center gap-6 text-sm font-semibold tracking-wide relative z-50">
        <a href="/" className="bg-brand text-white px-4 py-2 rounded">BERANDA</a>
        <a href="/#skor" className="text-white hover:text-brand transition">LIVE SCORE</a>

        {/* Mega Menu JADWAL */}
        <div className="group relative">
          <a href="/jadwal" className="text-white hover:text-brand transition flex items-center gap-1 py-4 -my-4">
            JADWAL <i className="fa-solid fa-chevron-down text-[10px] opacity-50 group-hover:opacity-100 transition"></i>
          </a>
          <MegaMenuJadwal schedule={schedule} />
        </div>

        <a href="/bagan" className="text-muted hover:text-white transition">BAGAN</a>

        {/* Mega Menu KLASEMEN */}
        <div className="group relative">
          <a href="/klasemen" className="text-white hover:text-brand transition flex items-center gap-1 py-4 -my-4">
            KLASEMEN <i className="fa-solid fa-chevron-down text-[10px] opacity-50 group-hover:opacity-100 transition"></i>
          </a>
          <MegaMenuKlasemen standings={standings} />
        </div>

        <a href="/tim" className="text-muted hover:text-white transition">TIM</a>
        <a href="/statistik" className="text-muted hover:text-white transition flex items-center gap-1">
          STATISTIK <i className="fa-solid fa-chevron-down text-[10px]"></i>
        </a>
        <a href="/berita" className="text-muted hover:text-white transition">BERITA</a>
        <a href="/tentang" className="text-muted hover:text-white transition">TENTANG</a>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button aria-label="Cari" className="w-10 h-10 rounded bg-surface/50 border border-white/10 hover:bg-surface hidden sm:flex items-center justify-center transition">
          <i className="fa-solid fa-search"></i>
        </button>
        {/* Hamburger (mobile) */}
        <button
          aria-label={mobile ? "Tutup menu" : "Buka menu"}
          aria-expanded={mobile}
          onClick={() => setMobile((v) => !v)}
          className="w-10 h-10 rounded bg-surface/50 border border-white/10 hover:bg-surface flex lg:hidden items-center justify-center transition"
        >
          <i className={`fa-solid ${mobile ? "fa-xmark" : "fa-bars"}`}></i>
        </button>
      </div>

      {/* Mobile menu panel */}
      {mobile && (
        <div className="absolute top-full left-0 right-0 lg:hidden bg-dark/95 backdrop-blur-xl border-b border-border z-[90]">
          <div className="flex flex-col px-6 py-4 gap-1 text-sm font-semibold">
            {Object.keys(MOBILE_HREF).map((l) => (
              <a
                key={l}
                href={MOBILE_HREF[l]}
                onClick={() => setMobile(false)}
                className="py-2.5 border-b border-white/5 last:border-0 text-muted hover:text-white transition"
              >
                {l}
              </a>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
