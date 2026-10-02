import { useState } from "react";
import { usePage } from "@inertiajs/react";

const MOBILE_HREF: Record<string, string> = {
  BERANDA: "/",
  "LIVE SCORE": "/#skor",
  JADWAL: "/jadwal",
  BRACKET: "/bagan",
  KLASEMEN: "/klasemen",
  TIM: "/tim",
  STATISTIK: "/statistik",
  BERITA: "/berita",
  GALERI: "/galeri",
  TENTANG: "/tentang",
};

type NavLink = { label: string; href: string; match: (url: string) => boolean };

const LINKS: NavLink[] = [
  { label: "BERANDA", href: "/", match: (u) => u === "/" },
  { label: "LIVE SCORE", href: "/#skor", match: (u) => u.startsWith("/#skor") },
  { label: "JADWAL", href: "/jadwal", match: (u) => u.startsWith("/jadwal") || u.startsWith("/pertandingan") },
  { label: "BRACKET", href: "/bagan", match: (u) => u.startsWith("/bagan") },
  { label: "KLASEMEN", href: "/klasemen", match: (u) => u.startsWith("/klasemen") },
  { label: "TIM", href: "/tim", match: (u) => u.startsWith("/tim") },
  { label: "STATISTIK", href: "/statistik", match: (u) => u.startsWith("/statistik") },
  { label: "BERITA", href: "/berita", match: (u) => u.startsWith("/berita") },
  { label: "GALERI", href: "/galeri", match: (u) => u.startsWith("/galeri") },
  { label: "TENTANG", href: "/tentang", match: (u) => u.startsWith("/tentang") },
];

const ACTIVE =
  "bg-red-600 text-white rounded-lg px-3.5 py-1.5 font-semibold transition-colors";
const IDLE =
  "text-neutral-300 hover:text-white hover:bg-neutral-800/60 rounded-lg px-3.5 py-1.5 transition-colors";

export default function Navbar() {
  const [mobile, setMobile] = useState(false);
  const { url } = usePage();
  const path = url.split("?")[0];

  return (
    <>
    <nav className="fixed top-0 inset-x-0 z-50 bg-dark/90 backdrop-blur border-b border-white/10">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16 relative">
      {/* Brand teks (tanpa logo) */}
      <a href="/" className="flex items-center gap-2.5" aria-label="Beranda">
        <div className="leading-tight">
          <div className="font-display font-bold text-base tracking-wide">TELKOM SCHOOL</div>
          <div className="text-brand text-xs font-bold tracking-widest">CUP VOL V</div>
        </div>
      </a>

      {/* Desktop Nav Links */}
      <div className="hidden lg:flex items-center gap-1 text-sm font-semibold tracking-wide relative z-50">
        {LINKS.map((l) => (
          <a key={l.label} href={l.href} className={l.match(path) ? ACTIVE : IDLE}>
            {l.label}
          </a>
        ))}
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
            {Object.keys(MOBILE_HREF).map((l) => {
              const link = LINKS.find((x) => x.label === l);
              const active = link ? link.match(path) : false;
              return (
                <a
                  key={l}
                  href={MOBILE_HREF[l]}
                  onClick={() => setMobile(false)}
                  className={`py-2.5 border-b border-white/5 last:border-0 transition ${
                    active ? "text-white font-bold" : "text-muted hover:text-white"
                  }`}
                >
                  {l}
                </a>
              );
            })}
          </div>
        </div>
      )}
      </div>
    </nav>
    <div className="h-16" aria-hidden="true" />
    </>
  );
}
