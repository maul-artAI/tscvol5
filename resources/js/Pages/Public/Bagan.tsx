
import { useState } from "react";
import type { StandingRow, Team } from "../../lib/api";
import BracketDiagram, { type BracketRound } from "../../Components/BracketDiagram";
import PublicLayout from "../../Layouts/PublicLayout";

type Brackets = Partial<
  Record<"SMA" | "SMP", { rounds: BracketRound[]; champion: Team | null }>
>;
type Tables = Partial<Record<"SMA" | "SMP", Record<string, StandingRow[]>>>;

export default function BaganPage({ brackets, tables }: { brackets: Brackets; tables: Tables }) {
  const [cat, setCat] = useState<"SMA" | "SMP">("SMA");
  const [group, setGroup] = useState("A");

  const rounds = brackets[cat]?.rounds || [];
  const champion = brackets[cat]?.champion || null;
  const gtable = (tables[cat]?.[group] || []).filter(
    (r) => (r.team.group_name || "") === `Grup ${group}`
  );

  return (
    <PublicLayout>
    <main className="min-h-screen bg-dark text-white">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="font-display italic font-bold text-4xl md:text-5xl uppercase mt-3">
          Bagan <span className="text-brand">Knockout</span>
        </h1>
        <p className="text-sm text-muted mt-2">Pemenang tiap laga otomatis maju ke babak berikutnya.</p>

        <div className="flex gap-2 mt-6 mb-8">
          {(["SMA", "SMP"] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`px-5 py-2 rounded text-sm font-bold uppercase tracking-wide transition ${
                cat === c ? "bg-brand text-white live-glow" : "bg-surface border border-border text-muted hover:text-white"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {rounds.length === 0 && gtable.length === 0 ? (
          <p className="text-sm text-muted">Memuat bagan...</p>
        ) : (
          <>
            {/* Fase Grup */}
            <div className="mb-10">
              <h2 className="font-display italic font-bold text-lg uppercase mb-3">
                <span className="text-brand">●</span> Fase Grup
              </h2>
              <div className="flex flex-wrap gap-2 mb-4">
                {["A", "B", "C", "D", "E", "F", "G", "H"].map((g) => (
                  <button
                    key={g}
                    onClick={() => setGroup(g)}
                    className={`w-10 h-10 rounded-lg text-sm font-bold transition ${
                      group === g ? "bg-brand text-white live-glow" : "bg-surface border border-border text-muted hover:text-white"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
              <div className="bg-surface border border-border rounded-xl overflow-x-auto">
                <table className="w-full text-sm tabular-nums min-w-[560px]">
                  <thead>
                    <tr className="text-muted text-xs border-b border-border/50 uppercase">
                      <th className="py-2 px-2 text-center w-8">#</th>
                      <th className="py-2 px-2 text-left">Tim</th>
                      <th className="py-2 px-1 text-center">M</th>
                      <th className="py-2 px-1 text-center">M</th>
                      <th className="py-2 px-1 text-center">S</th>
                      <th className="py-2 px-1 text-center">K</th>
                      <th className="py-2 px-1 text-center">GD</th>
                      <th className="py-2 px-2 text-center font-bold text-white">PTS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {gtable.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-4 text-center text-muted text-xs">Belum ada data grup {group}.</td>
                      </tr>
                    )}
                    {gtable.map((r) => (
                      <tr key={r.team.id} className="hover:bg-white/5 transition">
                        <td className={`py-2.5 px-2 text-center font-bold ${r.position <= 2 ? "text-brand" : ""}`}>{r.position}</td>
                        <td className="py-2.5 px-2 font-medium">{r.team.short_name || r.team.name}</td>
                        <td className="py-2.5 px-1 text-center text-muted">{r.played}</td>
                        <td className="py-2.5 px-1 text-center text-muted">{r.won}</td>
                        <td className="py-2.5 px-1 text-center text-muted">{r.drawn}</td>
                        <td className="py-2.5 px-1 text-center text-muted">{r.lost}</td>
                        <td className="py-2.5 px-1 text-center text-green-400">{r.goal_difference > 0 ? `+${r.goal_difference}` : r.goal_difference}</td>
                        <td className="py-2.5 px-2 text-center font-bold">{r.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] text-muted mt-2">Dua teratas tiap grup lolos ke 16 Besar.</p>
            </div>
            {rounds.length === 0 ? (
              <p className="text-sm text-muted bg-surface border border-border rounded-xl p-6 text-center">
                Bagan knockout {cat} belum disusun.
              </p>
            ) : (
              <BracketDiagram rounds={rounds} champion={champion} />
            )}
          </>
        )}
      </div>
    </main>
    </PublicLayout>
  );
}
