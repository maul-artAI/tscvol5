import { useMemo, useState } from "react";

export type HeatMatch = {
    id: number;
    date: string; // YYYY-MM-DD
    time?: string | null; // HH:MM
    court?: string | null; // "Lapangan 1" | "Lapangan 2"
    team1?: string | null;
    team2?: string | null;
};

type Tip = { x: number; y: number; date: string; court: string; games: HeatMatch[] } | null;

const COURTS = ["Lapangan 1", "Lapangan 2"];

const MONTHS_ID = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

function fmtDay(iso: string): string {
    const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
    if (isNaN(+d)) return iso.slice(0, 10);
    return `${d.getDate()} ${MONTHS_ID[d.getMonth()]}`;
}

function cellStyle(n: number): string {
    const base =
        "min-w-[48px] w-12 h-10 flex items-center justify-center text-xs font-mono font-semibold rounded border transition-all duration-150 tabular-nums";
    if (n <= 0) return `${base} bg-neutral-900/40 text-transparent border-white/5`;
    if (n <= 2)
        return `${base} bg-red-950/60 text-red-300 border border-red-900/30 hover:border-red-500/50 cursor-pointer`;
    if (n <= 4)
        return `${base} bg-red-800/80 text-white border border-red-700/50 hover:brightness-110 cursor-pointer`;
    return `${base} bg-red-600 text-white font-bold border border-red-500 shadow-[0_0_12px_rgba(220,38,38,0.35)] hover:brightness-110 cursor-pointer`;
}

export default function DailyMatchTimelineHeatmap({ matches = [] }: { matches?: HeatMatch[] }) {
    const [tip, setTip] = useState<Tip>(null);

    const dates = useMemo(
        () =>
            [...new Set(matches.map((m) => (m.date || "").slice(0, 10)).filter(Boolean))].sort(),
        [matches]
    );

    const grid = useMemo(() => {
        const map = new Map<string, HeatMatch[]>();
        for (const m of matches) {
            const key = `${(m.date || "").slice(0, 10)}|${m.court || ""}`;
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(m);
        }
        for (const list of map.values()) {
            list.sort((a, b) => (a.time || "").localeCompare(b.time || ""));
        }
        return map;
    }, [matches]);

    const showTip = (e: React.MouseEvent, date: string, court: string, games: HeatMatch[]) => {
        if (games.length === 0) return;
        setTip({ x: e.clientX, y: e.clientY, date, court, games });
    };

    return (
        <div className="bg-[#121212] border border-white/5 rounded-2xl p-5">
            <h2 className="text-sm font-bold tracking-wider text-white uppercase mb-4">
                Lini Masa Laga per Hari
            </h2>
            {dates.length === 0 ? (
                <p className="text-xs text-neutral-400 py-6 text-center">Belum ada jadwal bertanggal.</p>
            ) : (
                <div className="overflow-x-auto select-none pb-2 [scrollbar-width:thin] [scrollbar-color:#3f3f46_transparent]">
                    <table className="border-collapse">
                        <thead>
                            <tr>
                                <th className="text-xs text-neutral-400 font-medium text-left pr-4 pb-2 whitespace-nowrap">
                                    Lapangan / Tanggal
                                </th>
                                {dates.map((d) => (
                                    <th key={d} className="text-xs font-medium text-neutral-300 min-w-[48px] text-center pb-2 px-0.5">
                                        {fmtDay(d)}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {COURTS.map((court) => (
                                <tr key={court}>
                                    <td className="text-xs font-medium text-neutral-300 whitespace-nowrap pr-4 py-1">
                                        {court}
                                    </td>
                                    {dates.map((d) => {
                                        const games = grid.get(`${d}|${court}`) || [];
                                        return (
                                            <td key={d} className="p-0.5">
                                                <div
                                                    className={cellStyle(games.length)}
                                                    onMouseEnter={(e) => showTip(e, d, court, games)}
                                                    onMouseMove={(e) => {
                                                        if (games.length > 0) {
                                                            setTip((t) => (t ? { ...t, x: e.clientX, y: e.clientY } : t));
                                                        }
                                                    }}
                                                    onMouseLeave={() => setTip(null)}
                                                >
                                                    {games.length > 0 ? games.length : ""}
                                                </div>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {tip && (
                <div
                    className="fixed z-50 pointer-events-none bg-neutral-950 border border-neutral-700 text-xs text-neutral-200 rounded-lg p-2.5 shadow-xl max-w-64"
                    style={{
                        left: Math.min(tip.x + 14, window.innerWidth - 270),
                        top: Math.min(tip.y + 14, window.innerHeight - 160),
                    }}
                >
                    <p className="font-bold text-white mb-0.5">
                        {fmtDay(tip.date)} • {tip.court}
                    </p>
                    <p className="text-neutral-400 mb-1.5">Total {tip.games.length} Pertandingan</p>
                    <ul className="flex flex-col gap-1">
                        {tip.games.map((g) => (
                            <li key={g.id} className="whitespace-nowrap overflow-hidden text-ellipsis">
                                {g.team1 || "TBD"} vs {g.team2 || "TBD"}
                                {g.time && <span className="text-neutral-400"> ({g.time.slice(0, 5)})</span>}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
