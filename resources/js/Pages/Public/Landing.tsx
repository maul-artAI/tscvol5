import LiveMatchCard, { type TimelineRow } from "../../Components/LiveMatchCard";
import ScoreBoard from "../../Components/ScoreBoard";
import PublicLayout from "../../Layouts/PublicLayout";
import SectionDivider from "../../Components/SectionDivider";
import GalleryStrip from "../../Components/GalleryStrip";
import Reveal from "../../Components/Reveal";
import { useEffect, useState } from "react";
import { Link } from "@inertiajs/react";
import { apiFetch } from "../../lib/api";
import { getEcho, mergeMatch, type LiveMatch } from "../../lib/echo";
import type {
  NewsItem,
  SettingsMap,
  TournamentMatch,
} from "../../lib/api";

const HERO_BG_DEFAULT =
  "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1470&auto=format&fit=crop";

const FALLBACK_NEWS_IMG = [
  "https://images.unsplash.com/photo-1518605368461-1e1e38ce7136?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1552667466-07770ae110d0?q=80&w=600&auto=format&fit=crop",
];

const MONTHS_ID = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

function fmtDate(iso?: string | null, fallback = ""): string {
  if (!iso) return fallback;
  const d = new Date(iso);
  if (isNaN(+d)) return fallback;
  return `${d.getDate()} ${MONTHS_ID[d.getMonth()]} ${d.getFullYear()}`;
}

/* ---------- Fallback statis (dipakai hanya bila API tidak terjangkau) ---------- */

function mapUpcomingToCard(m: TournamentMatch, index: number) {
  return {
    lapangan: m.lapangan || `Lapangan ${index + 1}`,
    stage: m.stage || m.category,
    headerLive: false,
    live: false,
    team1Name: splitName(m.team1?.short_name || m.team1?.name),
    team2Name: splitName(m.team2?.short_name || m.team2?.name),
    team1Logo: m.team1?.logo_url || null,
    team2Logo: m.team2?.logo_url || null,
    team1Score: 0,
    team2Score: 0,
    clock: `${(m.match_date || "").slice(0, 10)} • ${(m.kickoff || "").slice(0, 5)}`,
    timeline: [] as TimelineRow[],
  };
}

/* ---------- Mapper API -> props kartu ---------- */

function splitName(name?: string | null): string[] {
  const words = (name || "?").toUpperCase().split(/\s+/).filter(Boolean);
  if (words.length <= 1) return [words[0] || "?", ""];
  return [words.slice(0, -1).join(" "), words[words.length - 1]];
}

function mapEvent(e: {
  minute: number;
  type: string;
  player_name: string;
  assist_name?: string | null;
  team_side: string;
}): TimelineRow {
  return {
    minute: `${e.minute}'`,
    icon: e.type === "yellow_card" ? "yellow" : e.type === "foul" || e.type === "wo_call" ? "foul" : e.type === "red_card" ? "red" : e.type === "shootout_miss" ? "miss" : "ball",
    text: e.player_name,
    sub:
      e.type === "own_goal"
        ? "(Own Goal)"
        : e.type === "shootout_goal"
          ? "(Penalti)"
          : e.type === "shootout_miss"
            ? "(Gagal Penalti)"
            : e.type === "wo_call"
              ? "(WO)"
              : e.assist_name
                ? `(Assist: ${e.assist_name})`
                : undefined,
    side: e.team_side === "team2" ? "team2" : "team1",
  };
}

function mapMatchToCard(m: TournamentMatch, index: number) {
  const keep = (e: { type: string }) => e.type !== "foul";
  const ev1 = (m.team1_events || []).filter(keep).map(mapEvent);
  const ev2 = (m.team2_events || []).filter(keep).map(mapEvent);
  const timeline =
    ev1.length + ev2.length > 0
      ? [...ev1, ...ev2]
      : (m.events || []).filter(keep).map(mapEvent);
  return {
    lapangan: m.lapangan || `Lapangan ${index + 1}`,
    stage: m.stage || m.category,
    headerLive: index === 0,
    team1Name: splitName(m.team1?.short_name || m.team1?.name),
    team2Name: splitName(m.team2?.short_name || m.team2?.name),
    team1Logo: m.team1?.logo_url || null,
    team2Logo: m.team2?.logo_url || null,
    team1Score: m.team1_score,
    team2Score: m.team2_score,
    clock: [m.period, m.clock_display || m.clock].filter(Boolean).join(" • "),
    period: m.period || null,
    clockDisplay: m.clock_display || m.clock || "00:00",
    matchId: m.id,
    clockRunning: !!m.clock_running && m.status === "live",
    clockEnded: !!m.clock_ended,
    pen1: m.penalty1,
    pen2: m.penalty2,
    showPen: !!m.is_penalty || (m.penalty1 != null && m.penalty2 != null && (m.penalty1 > 0 || m.penalty2 > 0)),
    timeline,
  };
}

const BENTO = [
  { icon: "fa-solid fa-video", title: "Live Score", desc: "Pantau pertandingan real-time", href: "/#skor" },
  { icon: "fa-regular fa-calendar-days", title: "Jadwal", desc: "Lihat jadwal lengkap", href: "/jadwal" },
  { icon: "fa-solid fa-sitemap", title: "Bracket", desc: "SMA & SMP", href: "/bagan" },
  { icon: "fa-solid fa-chart-column", title: "Klasemen", desc: "Posisi terbaru tim", href: "/klasemen" },
  { icon: "fa-solid fa-chart-pie", title: "Statistik", desc: "Top skor, assist, dll", href: "/statistik" },
  { icon: "fa-solid fa-users-rectangle", title: "Daftar Tim", desc: "Profil semua peserta", href: "/tim" },
];

type Props = {
  settings: SettingsMap;
  liveMatches: TournamentMatch[];
  schedule: TournamentMatch[];
  news: NewsItem[];
};

export default function Landing({ settings, liveMatches, schedule, news: newsRaw }: Props) {
  const s = settings || {};
  const tagline = s.hero_tagline || "Play, Respect, Grow Together";
  const subtitle = s.hero_subtitle || "More than a game, same passion, brighter generation";
  const venue = s.tournament_venue || "SMK TELKOM MAKASSAR";
  const categories = s.tournament_categories || "SMA & SMP";
  const liveBanner = s.live_banner_text || "Dua Lapangan, Satu Semangat";

  // Skor hero realtime: WebSocket + polling ringan tiap 10 dtk sebagai cadangan.
  const [liveMatchesLive, setLiveMatchesLive] = useState<TournamentMatch[]>(liveMatches);
  const [scheduleLive, setScheduleLive] = useState<TournamentMatch[]>(schedule);
  useEffect(() => {
    let alive = true;
    const applyUpdate = (m: LiveMatch) => {
      if (!alive) return;
      setLiveMatchesLive((prev) => mergeMatch(prev, m as TournamentMatch));
      setScheduleLive((prev) => mergeMatch(prev, m as TournamentMatch));
    };
    const echo = getEcho();
    echo?.channel("scores").listen(".match.updated", (e: { match: LiveMatch }) => {
      if (e?.match?.id) applyUpdate(e.match);
    });
    async function refresh() {
      if (document.hidden) return;
      try {
        const [l, sUp] = await Promise.all([
          apiFetch<{ data: TournamentMatch[] }>("/matches/live", { auth: false }),
          apiFetch<{ data: TournamentMatch[] }>("/matches?status=scheduled", { auth: false }),
        ]);
        if (!alive) return;
        setLiveMatchesLive(l.data);
        setScheduleLive(sUp.data);
      } catch {
        /* offline: tampilkan data terakhir */
      }
    }
    const t = setInterval(refresh, 10000);
    return () => {
      alive = false;
      clearInterval(t);
      echo?.leaveChannel("scores");
    };
  }, []);

  const hasLive = liveMatchesLive.length > 0;
  const cards = hasLive
    ? liveMatchesLive.map(mapMatchToCard)
    : scheduleLive.filter((m) => m.status === "scheduled").slice(0, 2).map(mapUpcomingToCard);

  const apiNews = (newsRaw || []).map((n, i) => ({
    title: n.title,
    slug: n.slug,
    category: n.category,
    excerpt: n.excerpt || "",
    cover_url: n.cover_url || FALLBACK_NEWS_IMG[i % FALLBACK_NEWS_IMG.length],
    published_at: fmtDate(n.published_at, ""),
  }));
  const news = apiNews.slice(0, 3);

  return (
    <PublicLayout>
      {/* Background Layer for Header/Hero */}
      <div className="absolute top-0 left-0 w-full h-[700px] z-0 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-top opacity-30 mix-blend-luminosity"
          style={{ backgroundImage: `url('${s.hero_bg || HERO_BG_DEFAULT}')` }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-r from-dark via-dark/80 to-transparent"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-dark via-dark/60 to-transparent"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-dark/40 to-transparent"></div>
      </div>

      {/* Main Container */}
      <div className="relative z-10 max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">

        {/* Hero & Live Matches Section */}
        <div className="flex flex-col lg:flex-row lg:items-center mt-12 gap-10">
          {/* Left: Hero Text */}
          <div className="flex-1 flex flex-col justify-center items-center sm:items-start text-center sm:text-left min-w-0">
            <Reveal>
            <div className="mb-6 max-w-full flex flex-col items-center gap-3">
              <div className="inline-flex flex-col items-center bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 max-w-full">
                <span className="text-[10px] tracking-widest uppercase text-neutral-400 font-semibold mb-2 block text-center">Official Tournament</span>
                <div className="flex items-center gap-6 max-w-full flex-wrap justify-center">
                <img
                  src={s.logo_tsc || "/tsclogo.png"}
                  alt="Logo TSC"
                  onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "/tsclogo.png"; }}
                  className="h-30 w-auto max-w-[38vw] object-contain mix-blend-screen"
                  style={{ filter: "drop-shadow(0 0 12px rgba(255,255,255,0.15))" }}
                />
                <div className="h-16 w-px bg-white/20 shrink-0"></div>
                <img
                  src={s.logo_smk || "/stelk.png"}
                  alt="Logo SMK Telkom"
                  onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "/stelk.png"; }}
                  className="h-30 w-auto max-w-[38vw] object-contain"
                  style={{ filter: "drop-shadow(0 0 12px rgba(255,255,255,0.15))" }}
                />
                </div>
              </div>
            </div>
            </Reveal>
            <Reveal delay={100}>
            <h1 className="font-display italic font-bold text-6xl md:text-8xl leading-[0.9] tracking-tight uppercase text-transparent bg-clip-text bg-gradient-to-br from-white to-gray-400">
              {s.hero_line_1 || "TELKOM SCHOOL"}
            </h1>
            <h1 className="font-display italic font-bold text-6xl md:text-8xl leading-[0.9] tracking-tight text-brand uppercase mt-1">
              {s.hero_line_2 || "CUP"} <span className="text-5xl md:text-7xl text-white">VOL V</span>
            </h1>
            </Reveal>

            <Reveal delay={200}>
            <div className="mt-6 flex flex-col items-center sm:items-start">
              <p className="font-display italic text-2xl text-gray-300">{tagline}</p>
              <p className="text-sm text-muted mt-2 tracking-widest uppercase">{subtitle}</p>
            </div>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-6 mt-10 text-sm font-medium">
              <div className="flex items-center gap-2"><i className="fa-solid fa-location-dot text-brand"></i> {venue}</div>
              <div className="flex items-center gap-2"><i className="fa-solid fa-users text-brand"></i> {categories}</div>
            </div>
            </Reveal>

            <Reveal delay={300}>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-5">
              <a href="/jadwal" className="bg-red-600 hover:bg-red-700 text-white font-medium text-sm px-5 py-2.5 rounded-lg shadow-md transition-colors">
                Lihat Jadwal Lengkap
              </a>
              <a href="/bagan" className="border border-white/20 hover:bg-white/10 text-neutral-200 font-medium text-sm px-5 py-2.5 rounded-lg transition-colors">
                Bracket Turnamen
              </a>
            </div>
            </Reveal>
          </div>

          {/* Right: Live Matches */}
          <Reveal variant="scale" delay={150} className="flex-1 max-w-3xl w-full">
          <div className="w-full">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                {hasLive ? (
                  <div className="bg-brand text-white px-4 py-1.5 rounded-full font-bold text-sm flex items-center gap-2 live-glow italic">
                    <i className="fa-solid fa-tower-broadcast animate-pulse"></i> LIVE NOW
                  </div>
                ) : (
                  <div className="bg-white/10 text-gray-300 px-4 py-1.5 rounded-full font-bold text-sm flex items-center gap-2 italic">
                    <i className="fa-regular fa-calendar"></i> NEXT MATCHES
                  </div>
                )}
                <span className="text-sm font-medium text-gray-300 hidden md:block uppercase tracking-wider">{liveBanner}</span>
              </div>
              <a href="/jadwal" className="text-xs font-semibold hover:text-brand transition flex items-center gap-2">
                LIHAT SEMUA PERTANDINGAN <i className="fa-solid fa-arrow-right"></i>
              </a>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {cards.length === 0 && (
                <p className="text-xs text-muted bg-surface border border-border rounded-xl px-4 py-6 text-center md:col-span-2">
                  Belum ada jadwal pertandingan. Pantau terus halaman ini.
                </p>
              )}
              {cards.map((c, i) => (
                <LiveMatchCard key={`${c.lapangan}-${i}`} {...c} />
              ))}
            </div>
          </div>
          </Reveal>
        </div>

        <SectionDivider />

        {/* Skor: live, upcoming, selesai + detail per laga */}
        <ScoreBoard initialMatches={schedule} />

        <SectionDivider />

        {/* Quick Nav Bento */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mt-12 relative z-20">
          {BENTO.map((b, i) => (
            <Reveal key={b.title} delay={Math.min(i, 5) * 70} className="h-full">
            <a href={b.href} className="bg-surface border border-border p-4 rounded-xl group flex items-center gap-3 cursor-pointer hover:border-red-500/50 hover:bg-neutral-800/80 hover:-translate-y-1 transition-all duration-200 h-full">
              <div className="w-12 h-12 rounded bg-dark flex items-center justify-center text-brand group-hover:scale-110 transition-transform">
                <i className={`${b.icon} text-xl`}></i>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-sm uppercase tracking-wide">{b.title}</h3>
                <p className="text-[10px] text-muted mt-0.5 leading-tight">{b.desc}</p>
              </div>
              <i className="fa-solid fa-arrow-right text-muted text-xs group-hover:text-brand transition"></i>
            </a>
            </Reveal>
          ))}
        </div>

        {/* Main Content Area */}
        <SectionDivider />
        <Reveal>
        <div className="mt-0 mb-8">
          <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
            <h2 className="font-bold text-xl flex items-center gap-2 tracking-wide uppercase">
              <i className="fa-regular fa-newspaper text-brand"></i> HIGHLIGHTS &amp; BERITA TERBARU
            </h2>
            <a href="/berita" className="text-sm text-muted hover:text-white transition flex items-center gap-2">
              Lihat Semua Berita <i className="fa-solid fa-arrow-right"></i>
            </a>
          </div>

          {/* Berita Grid (Full Width) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {news.length > 0 ? (
            <>
            {news.map((n) => (
              <Link key={n.slug || n.title} href={n.slug ? `/berita/${n.slug}` : "/berita"} className="bg-surface border border-border rounded-xl flex flex-col hover:border-brand/50 transition cursor-pointer group">
                <div className="h-40 overflow-hidden relative border-b border-border">
                  <img
                    src={n.cover_url || FALLBACK_NEWS_IMG[0]}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition duration-700"
                    alt="News thumbnail"
                  />
                  <div className={`absolute top-3 left-3 text-white text-[10px] font-bold px-2.5 py-1 rounded uppercase tracking-wide ${n.category === "Analisis Tim" ? "bg-blue-600" : "bg-brand"}`}>{n.category}</div>
                </div>
                <div className="p-5 flex flex-col flex-1">
                  {n.published_at && (
                    <div className="text-xs text-muted mb-2 flex items-center gap-2"><i className="fa-regular fa-clock"></i> {n.published_at}</div>
                  )}
                  <h3 className="font-bold text-lg leading-snug group-hover:text-brand transition mb-2">{n.title}</h3>
                  {n.excerpt && <p className="text-sm text-gray-400 line-clamp-3 leading-relaxed">{n.excerpt}</p>}
                </div>
              </Link>
            ))}
            </>
            ) : (
            <div className="col-span-full flex flex-col items-center justify-center text-center py-12 border border-dashed border-white/15 rounded-xl">
              <i className="fa-regular fa-newspaper text-3xl text-muted mb-3"></i>
              <p className="font-bold text-white">Belum ada berita</p>
              <p className="text-sm text-muted mt-1 max-w-md">Liputan pertandingan dan berita turnamen akan diperbarui berkala selama kompetisi berlangsung.</p>
            </div>
            )}
          </div>
        </div>
        </Reveal>

        <SectionDivider />
        <GalleryStrip />

        {/* Footer / Bottom Branding */}
        <div className="mt-16 pt-6 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted">
          <div>
            <span className="font-bold text-white tracking-widest uppercase">TELKOM SCHOOL CUP VOL V</span>
            <br />SMK TELKOM MAKASSAR
          </div>
          <div className="uppercase tracking-widest font-semibold text-[10px]">
            ONE SCHOOL <span className="text-brand mx-1">•</span> ONE TEAM <span className="text-brand mx-1">•</span> BRIGHTER TOMORROW
          </div>
          <div className="flex items-center gap-4 text-lg">
            <a href="#" aria-label="Instagram" className="hover:text-white transition"><i className="fa-brands fa-instagram"></i></a>
            <a href="#" aria-label="YouTube" className="hover:text-white transition"><i className="fa-brands fa-youtube"></i></a>
            <a href="#" aria-label="TikTok" className="hover:text-white transition"><i className="fa-brands fa-tiktok"></i></a>
            <span className="text-xs font-bold font-sans tracking-wide ml-2 hover:text-brand transition cursor-pointer">#TelkomSchoolFutsalCup</span>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
