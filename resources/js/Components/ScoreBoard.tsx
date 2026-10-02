
import { useEffect, useMemo, useState } from "react";
import { Link } from "@inertiajs/react";
import { apiFetch, type TournamentMatch } from "../lib/api";
import { getEcho, mergeMatch, type LiveMatch } from "../lib/echo";
import Reveal from "./Reveal";

const DAYS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

function dayParts(iso: string): { dow: string; num: string; mon: string } {
  const d = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso);
  return { dow: DAYS[d.getDay()], num: String(d.getDate()), mon: MONTHS[d.getMonth()] };
}

function Logo({ url, name }: { url?: string | null; name?: string | null }) {
  if (url) return <img src={url} alt="" loading="lazy" decoding="async" className="w-9 h-9 rounded-full object-cover bg-white/10 shrink-0" />;
  return (
    <span className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-muted shrink-0 text-sm">
      <i className="fa-solid fa-shield-halved"></i>
    </span>
  );
}

type Filter = "semua" | "live" | "upcoming" | "finished";

function firstDate(list: TournamentMatch[]): string {
  const dates = [...new Set(list.map((m) => (m.match_date || "").slice(0, 10)).filter(Boolean))].sort();
  const t = new Date();
  const iso = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
  return dates.includes(iso) ? iso : dates[0] || "";
}

export default function ScoreBoard({ initialMatches = [] }: { initialMatches?: TournamentMatch[] }) {
  const [matches, setMatches] = useState<TournamentMatch[]>(initialMatches);
  const [date, setDate] = useState<string>(() => firstDate(initialMatches));
  const [filter, setFilter] = useState<Filter>("semua");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const LIMIT = 6;

  useEffect(() => {
    let alive = true;
    const echo = getEcho();
    echo?.channel("scores").listen(".match.updated", (e: { match: LiveMatch }) => {
      if (!alive || !e?.match?.id) return;
      setMatches((prev) => mergeMatch(prev, e.match as TournamentMatch));
    });
    // Data awal sudah dari server: lewati fetch pertama, langsung jadwalkan refresh.
    let skipFirst = initialMatches.length > 0;
    async function refresh() {
      if (skipFirst) {
        skipFirst = false;
        return;
      }
      try {
        const res = await apiFetch<{ data: TournamentMatch[] }>("/matches", { auth: false });
        if (alive) {
          setMatches(res.data);
          setDate((d) => d || firstDate(res.data));
        }
      } catch {
        /* offline: tampilkan data terakhir */
      }
    }
    refresh();
    const t = setInterval(() => {
      if (!document.hidden) refresh();
    }, 10000);
    return () => {
      alive = false;
      clearInterval(t);
      echo?.leaveChannel("scores");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dates = useMemo(
    () => [...new Set(matches.map((m) => (m.match_date || "").slice(0, 10)).filter(Boolean))].sort(),
    [matches]
  );
  const rowsFor = (category: "SMA" | "SMP") =>
    matches
      .filter(
        (m) =>
          m.category === category &&
          (!date || (m.match_date || "").slice(0, 10) === date) &&
          (filter === "semua" ||
            (filter === "upcoming" ? m.status === "scheduled" : m.status === filter))
      )
      .sort((a, b) => {
        // Live teratas; terjadwal terdekat dulu; selesai terbaru dulu.
        const rank = (s?: string) => (s === "live" ? 0 : s === "scheduled" ? 1 : 2);
        const r = rank(a.status) - rank(b.status);
        if (r !== 0) return r;
        const ka = a.kickoff || "";
        const kb = b.kickoff || "";
        return a.status === "finished" ? kb.localeCompare(ka) : ka.localeCompare(kb);
      });

  const dayIdx = dates.indexOf(date);
  const windows = dates.slice(Math.max(0, dayIdx - 2), dayIdx + 3);

  const catLabel = (c: "SMA" | "SMP") => (c === "SMA" ? "SMA/SMK" : "SMP");

  // Tanggal berikutnya yang punya laga kategori tsb (untuk tombol empty state).
  const nextDateFor = (c: "SMA" | "SMP") =>
    dates.find(
      (d) => d > date && matches.some((m) => m.category === c && (m.match_date || "").slice(0, 10) === d)
    ) || dates.find((d) => d > date);

  return (
    <section id="skor" aria-label="Skor pertandingan" className="py-12 scroll-mt-20">
      <div className="flex items-end justify-between mb-4">
        <h2 className="font-display italic font-bold text-2xl uppercase">Jadwal & Skor</h2>
        <Link href="/jadwal" className="text-xs font-semibold text-brand hover:underline">
          See More
        </Link>
      </div>

      {/* Strip tanggal */}
      <div className="flex items-center gap-1 mb-4">
        <button
          onClick={() => dayIdx > 0 && setDate(dates[dayIdx - 1])}
          className="text-muted hover:text-white px-1"
          aria-label="Tanggal sebelumnya"
        >
          ‹
        </button>
        <div className="flex gap-1.5 overflow-x-auto hide-scrollbar flex-1">
          {windows.map((d) => {
            const p = dayParts(d);
            const active = d === date;
            return (
              <button
                key={d}
                onClick={() => setDate(d)}
                className={`flex flex-col items-center px-3 py-1.5 rounded-lg text-[11px] leading-tight shrink-0 transition ${
                  active ? "text-white" : "text-muted hover:text-white"
                }`}
              >
                <span>{p.dow}</span>
                <span className={`font-bold ${active ? "text-brand border-b-2 border-brand" : ""}`}>{p.num}</span>
                <span className="text-[10px]">{p.mon}</span>
              </button>
            );
          })}
        </div>
        <button
          onClick={() => dayIdx < dates.length - 1 && setDate(dates[dayIdx + 1])}
          className="text-muted hover:text-white px-1"
          aria-label="Tanggal berikutnya"
        >
          ›
        </button>
      </div>

      {/* Filter status */}
      <div className="flex gap-4 border-b border-white/10 mb-2 text-[13px] font-semibold">
        {(
          [
            ["live", "Live"],
            ["upcoming", "Upcoming"],
            ["finished", "Selesai"],
            ["semua", "Semua"],
          ] as Array<[Filter, string]>
        ).map(([v, label]) => (
          <button
            key={v}
            onClick={() => setFilter(v)}
            className={`pb-2 transition ${
              filter === v ? "text-white border-b-2 border-brand" : "text-muted hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Daftar skor per kategori: 2 kolom di desktop, tumpuk di mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
      {(
        [
          ["SMA", "KATEGORI SMA/SMK"],
          ["SMP", "KATEGORI SMP"],
        ] as const
      ).map(([c, label], idx) => {
        const list = rowsFor(c);
        const next = nextDateFor(c);
        return (
          <Reveal key={c} delay={idx * 120}>
          <div className="mb-6 last:mb-0 lg:mb-0 bg-surface/40 border border-white/5 rounded-2xl p-4 flex flex-col h-full">
            <h3 className="text-xs font-bold tracking-widest text-muted uppercase mb-2">{label}</h3>
            {list.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-8 px-4 border border-dashed border-white/10 rounded-xl">
                <i className="fa-regular fa-calendar-days text-2xl text-muted/60 mb-2"></i>
                <p className="text-[13px] font-semibold text-white">Pertandingan kategori {catLabel(c)} belum dimulai untuk tanggal ini</p>
                {next && (
                  <button
                    onClick={() => setDate(next)}
                    className="mt-2 text-xs font-bold text-brand hover:text-white transition"
                  >
                    Cek Hari Berikutnya →
                  </button>
                )}
              </div>
            ) : (
              <div className="flex-1">
                {(expanded[c] ? list : list.slice(0, LIMIT)).map((m) => (
          <Link
            key={m.id}
            href={`/pertandingan/${m.id}`}
            className="grid grid-cols-[64px_1fr_auto] items-center gap-2 py-3 border-b border-white/5 hover:bg-white/[0.02] transition"
          >
            <div className="text-[11px] text-muted leading-tight flex flex-col items-start gap-1">
              {m.status === "live" ? (
                <span className="text-brand font-bold">LIVE</span>
              ) : m.status === "finished" ? (
                <span className="bg-neutral-800 text-neutral-400 text-xs px-2 py-0.5 rounded border border-neutral-700/50 font-bold">FT</span>
              ) : (
                <span className="bg-neutral-800 text-neutral-400 text-xs px-2 py-0.5 rounded border border-neutral-700/50 font-bold tabular-nums">{(m.kickoff || "").slice(0, 5)}</span>
              )}
              <span className="bg-neutral-800 text-neutral-400 text-xs px-2 py-0.5 rounded border border-neutral-700/50 tabular-nums">{m.lapangan?.replace("Lapangan", "Lap.")}</span>
            </div>
            <div className="min-w-0">
              {[
                { t: m.team1, s: m.team1_score },
                { t: m.team2, s: m.team2_score },
              ].map((r, i) => (
                <div key={i} className="flex items-center gap-2 py-0.5">
                  <Logo url={r.t?.logo_url} name={r.t?.name} />
                  <span className="flex-1 truncate text-[13px] font-medium">
                    {r.t?.name || "TBD"}
                  </span>
                  <span className="font-display italic font-bold tabular-nums">{r.s}</span>
                </div>
              ))}
            </div>
            <i className="fa-solid fa-chevron-right text-muted text-xs"></i>
          </Link>
                ))}
                {list.length > LIMIT && (
                  <button
                    onClick={() => setExpanded((e) => ({ ...e, [c]: !e[c] }))}
                    className="w-full mt-1 text-xs font-bold text-brand hover:text-white transition py-2"
                  >
                    {expanded[c] ? "Tampilkan lebih sedikit ↑" : `Tampilkan semua ${list.length} laga ↓`}
                  </button>
                )}
              </div>
            )}
          </div>
          </Reveal>
        );
      })}
      </div>
    </section>
  );
}
