import LiveMatchCard, { type TimelineRow } from "../../Components/LiveMatchCard";
import ScoreBoard from "../../Components/ScoreBoard";
import PublicLayout from "../../Layouts/PublicLayout";
import type {
  NewsItem,
  SettingsMap,
  TournamentMatch,
} from "../../lib/api";

const HERO_BG =
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

const FALLBACK_NEWS = [
  {
    title: "Telkom School Futsal Cup Vol V Siap Digelar Penuh Spektakuler!",
    category: "Turnamen",
    excerpt:
      "Turnamen futsal pelajar terbesar di Makassar kembali hadir. Ribuan supporter diprediksi akan memadati tribun lapangan SMK Telkom Makassar.",
    cover_url: FALLBACK_NEWS_IMG[0],
    published_at: "20 Sep 2026",
  },
  {
    title: "Peta Kekuatan Tim SMA: Siapa Kandidat Kuat Juara Tahun Ini?",
    category: "Analisis Tim",
    excerpt:
      "Menganalisis kekuatan juara bertahan dan tim-tim kuda hitam yang siap memberi kejutan di fase grup Telkom School Futsal Cup Vol V.",
    cover_url: FALLBACK_NEWS_IMG[1],
    published_at: "18 Sep 2026",
  },
];

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
    icon: e.type === "goal" ? "ball" : e.type === "yellow_card" ? "yellow" : e.type === "foul" ? "foul" : "red",
    text: e.player_name,
    sub: e.assist_name ? `(Assist: ${e.assist_name})` : undefined,
    side: e.team_side === "team2" ? "team2" : "team1",
  };
}

function mapMatchToCard(m: TournamentMatch, index: number) {
  const ev1 = (m.team1_events || []).map(mapEvent);
  const ev2 = (m.team2_events || []).map(mapEvent);
  const timeline =
    ev1.length + ev2.length > 0
      ? [...ev1, ...ev2]
      : (m.events || []).map(mapEvent);
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
    timeline,
  };
}

const BENTO = [
  { icon: "fa-solid fa-video", title: "Live Score", desc: "Pantau pertandingan real-time", href: "/#skor" },
  { icon: "fa-regular fa-calendar-days", title: "Jadwal", desc: "Lihat jadwal lengkap", href: "/jadwal" },
  { icon: "fa-solid fa-sitemap", title: "Bagan", desc: "SMA & SMP", href: "/bagan" },
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
  const dates = s.tournament_dates || "26 SEP - 10 OCT 2026";
  const venue = s.tournament_venue || "SMK TELKOM MAKASSAR";
  const categories = s.tournament_categories || "SMA & SMP";
  const liveBanner = s.live_banner_text || "Dua Lapangan, Satu Semangat";

  const hasLive = liveMatches.length > 0;
  const cards = hasLive
    ? liveMatches.map(mapMatchToCard)
    : schedule.filter((m) => m.status === "scheduled").slice(0, 2).map(mapUpcomingToCard);

  const apiNews = (newsRaw || []).map((n, i) => ({
    title: n.title,
    category: n.category,
    excerpt: n.excerpt || "",
    cover_url: n.cover_url || FALLBACK_NEWS_IMG[i % FALLBACK_NEWS_IMG.length],
    published_at: fmtDate(n.published_at, ""),
  }));
  const news = apiNews.length > 0 ? apiNews : FALLBACK_NEWS;

  return (
    <PublicLayout>
      {/* Background Layer for Header/Hero */}
      <div className="absolute top-0 left-0 w-full h-[700px] z-0 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-top opacity-30 mix-blend-luminosity"
          style={{ backgroundImage: `url('${HERO_BG}')` }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-r from-dark via-dark/80 to-transparent"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-dark via-dark/60 to-transparent"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-dark/40 to-transparent"></div>
      </div>

      {/* Main Container */}
      <div className="relative z-10 max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">

        {/* Hero & Live Matches Section */}
        <div className="flex flex-col lg:flex-row mt-12 gap-10">
          {/* Left: Hero Text */}
          <div className="flex-1 flex flex-col justify-center">
            <h1 className="font-display italic font-bold text-6xl md:text-8xl leading-[0.9] tracking-tight uppercase text-transparent bg-clip-text bg-gradient-to-br from-white to-gray-400">
              TELKOM SCHOOL
            </h1>
            <h1 className="font-display italic font-bold text-6xl md:text-8xl leading-[0.9] tracking-tight text-brand uppercase mt-1">
              FUTSAL CUP <span className="text-5xl md:text-7xl text-white">VOL V</span>
            </h1>

            <div className="mt-6 flex flex-col items-start">
              <p className="font-display italic text-2xl text-gray-300">{tagline}</p>
              <p className="text-sm text-muted mt-2 tracking-widest uppercase">{subtitle}</p>
            </div>

            <div className="flex flex-wrap items-center gap-6 mt-10 text-sm font-medium">
              <div className="flex items-center gap-2"><i className="fa-regular fa-calendar text-brand"></i> {dates}</div>
              <div className="flex items-center gap-2"><i className="fa-solid fa-location-dot text-brand"></i> {venue}</div>
              <div className="flex items-center gap-2"><i className="fa-solid fa-users text-brand"></i> {categories}</div>
            </div>
          </div>

          {/* Right: Live Matches */}
          <div className="flex-1 max-w-3xl w-full">
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
        </div>

        {/* Skor: live, upcoming, selesai + detail per laga */}
        <ScoreBoard initialMatches={schedule} />

        {/* Quick Nav Bento */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mt-12 relative z-20">
          {BENTO.map((b) => (
            <a key={b.title} href={b.href} className="bg-surface border border-border p-4 rounded-xl hover:border-brand transition group flex items-center gap-3 cursor-pointer hover:bg-surface/80">
              <div className="w-12 h-12 rounded bg-dark flex items-center justify-center text-brand group-hover:scale-110 transition-transform">
                <i className={`${b.icon} text-xl`}></i>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-sm uppercase tracking-wide">{b.title}</h3>
                <p className="text-[10px] text-muted mt-0.5 leading-tight">{b.desc}</p>
              </div>
              <i className="fa-solid fa-arrow-right text-muted text-xs group-hover:text-brand transition"></i>
            </a>
          ))}
        </div>

        {/* Main Content Area */}
        <div className="mt-12 mb-8">
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
            {/* Graphic Banner */}
            <div className="bg-surface border border-brand/20 rounded-xl overflow-hidden relative h-[320px] group cursor-pointer lg:col-span-1">
              <img
                src="https://images.unsplash.com/photo-1579952363873-27f3bade9f55?q=80&w=1000&auto=format&fit=crop"
                className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-50 transition duration-500 group-hover:scale-105"
                alt="Futsal Player"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-dark/90 via-dark/40 to-transparent"></div>
              <div className="absolute inset-0 p-6 flex flex-col justify-end items-end text-right">
                <div className="font-display italic font-bold text-4xl md:text-5xl leading-none text-white drop-shadow-md">FUTSAL</div>
                <div className="font-display italic font-bold text-4xl md:text-5xl leading-none text-white drop-shadow-md">BUILDS</div>
                <div className="font-display italic font-bold text-4xl md:text-5xl leading-none text-brand drop-shadow-md live-glow">BETTER</div>
                <div className="font-display italic font-bold text-4xl md:text-5xl leading-none text-brand drop-shadow-md live-glow">PEOPLE</div>
              </div>
            </div>

            {news.map((n) => (
              <div key={n.title} className="bg-surface border border-border rounded-xl flex flex-col hover:border-brand/50 transition cursor-pointer group">
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
              </div>
            ))}
          </div>
        </div>

        {/* Footer / Bottom Branding */}
        <div className="mt-16 pt-6 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted">
          <div>
            <span className="font-bold text-white tracking-widest uppercase">TELKOM SCHOOL FUTSAL CUP VOL V</span>
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
