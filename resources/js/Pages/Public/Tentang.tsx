import PublicLayout from "../../Layouts/PublicLayout";
import Reveal from "../../Components/Reveal";

export default function TentangPage({ settings }: { settings: Record<string, string> }) {
  const s = settings || {};
  const info = [
    { icon: "fa-regular fa-calendar", label: "Tanggal", value: s.tournament_dates || "26 SEP - 10 OCT 2026" },
    { icon: "fa-solid fa-location-dot", label: "Venue", value: s.tournament_venue || "SMK Telkom Makassar" },
    { icon: "fa-solid fa-users", label: "Kategori", value: s.tournament_categories || "SMA & SMP" },
  ];

  return (
    <PublicLayout>
    <main className="min-h-screen bg-dark text-white">
      <div className="max-w-[860px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Reveal>
        <h1 className="font-display italic font-bold text-4xl md:text-5xl uppercase mt-3">
          Tentang <span className="text-brand">Turnamen</span>
        </h1>
        <p className="font-display italic text-2xl text-gray-300 mt-4">
          {s.hero_tagline || "Play, Respect, Grow Together"}
        </p>
        <p className="text-sm text-muted mt-2 tracking-widest uppercase">
          {s.hero_subtitle || "More than a game, same passion, brighter generation"}
        </p>
        </Reveal>

        <Reveal delay={120}>

        <div className="grid sm:grid-cols-3 gap-3 mt-8">
          {info.map((i) => (
            <div key={i.label} className="bg-surface border border-border rounded-xl p-4">
              <i className={`${i.icon} text-brand text-xl`}></i>
              <div className="text-[11px] font-bold text-muted uppercase mt-2">{i.label}</div>
              <div className="font-bold text-sm mt-0.5">{i.value}</div>
            </div>
          ))}
        </div>

        <div className="bg-surface border border-border rounded-xl p-5 mt-6 text-sm leading-relaxed text-gray-300">
          <h2 className="font-display italic font-bold text-xl uppercase text-white mb-2">Format Kompetisi</h2>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>32 tim SMA/SMK dan 32 tim SMP, terbagi dalam 8 grup berisi 4 tim.</li>
            <li>Fase grup memakai sistem round-robin; dua teratas tiap grup lolos ke 16 Besar.</li>
            <li>Fase knockout: 16 Besar → 8 Besar → Semifinal → Final, satu venue di SMK Telkom Makassar.</li>
            <li>Semua laga dipantau live melalui dashboard ini.</li>
          </ul>
        </div>

        <p className="text-center text-xs text-muted mt-10 tracking-widest uppercase">
          One School <span className="text-brand mx-1">•</span> One Team <span className="text-brand mx-1">•</span> Brighter Tomorrow
        </p>
        </Reveal>
      </div>
    </main>
    </PublicLayout>
  );
}
