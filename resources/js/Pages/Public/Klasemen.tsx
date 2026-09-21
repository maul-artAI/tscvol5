
import { useState } from "react";
import type { StandingRow } from "../../lib/api";
import PublicLayout from "../../Layouts/PublicLayout";

const GROUPS = ["A", "B", "C", "D", "E", "F", "G", "H"];

export default function KlasemenPage({ tables }: { tables: Record<string, Record<string, StandingRow[]>> }) {
  const [cat, setCat] = useState<"SMA" | "SMP">("SMA");
  const [group, setGroup] = useState("A");
  const rows = tables?.[cat]?.[group] || [];

  return (
    <PublicLayout>
    <main className="min-h-screen bg-dark text-white">
      <div className="max-w-[900px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="font-display italic font-bold text-4xl md:text-5xl uppercase mt-3">
          Klasemen <span className="text-brand">Sementara</span>
        </h1>
        <p className="text-sm text-muted mt-2">Dua teratas tiap grup lolos ke 16 Besar.</p>

        <div className="flex gap-2 mt-6">
          {(["SMA", "SMP"] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`px-5 py-2 rounded text-sm font-bold uppercase transition ${
                cat === c ? "bg-brand text-white live-glow" : "bg-surface border border-border text-muted hover:text-white"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 mt-3 mb-6">
          {GROUPS.map((g) => (
            <button
              key={g}
              onClick={() => setGroup(g)}
              className={`w-10 h-10 rounded-lg text-sm font-bold transition ${
                group === g ? "bg-brand text-white" : "bg-surface border border-border text-muted hover:text-white"
              }`}
            >
              {g}
            </button>
          ))}
        </div>

        {rows.length === 0 ? (
          <p className="text-sm text-muted bg-surface border border-border rounded-xl p-6 text-center">
            Belum ada data.
          </p>
        ) : (
          <div className="bg-surface border border-border rounded-xl overflow-x-auto">
            <table className="w-full text-sm tabular-nums min-w-[600px]">
              <thead>
                <tr className="text-muted text-xs border-b border-border/50 uppercase">
                  <th className="py-3 px-3 text-center w-10">#</th>
                  <th className="py-3 px-3 text-left">Tim</th>
                  <th className="py-3 px-2 text-center">M</th>
                  <th className="py-3 px-2 text-center">M</th>
                  <th className="py-3 px-2 text-center">S</th>
                  <th className="py-3 px-2 text-center">K</th>
                  <th className="py-3 px-2 text-center">GD</th>
                  <th className="py-3 px-3 text-center font-bold text-white">PTS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {rows.map((r) => (
                  <tr key={r.team.id} className={`hover:bg-white/5 transition ${r.position <= 2 ? "bg-brand/[0.04]" : ""}`}>
                    <td className={`py-3 px-3 text-center font-bold ${r.position <= 2 ? "text-brand" : ""}`}>{r.position}</td>
                    <td className="py-3 px-3 font-medium">
                      <span className="flex items-center gap-2">
                        {r.team.logo_url ? (
                          <img src={r.team.logo_url} alt="" className="w-6 h-6 rounded-full object-cover" />
                        ) : (
                          <i className="fa-solid fa-shield-halved text-muted"></i>
                        )}
                        {r.team.name}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-center text-muted">{r.played}</td>
                    <td className="py-3 px-2 text-center text-muted">{r.won}</td>
                    <td className="py-3 px-2 text-center text-muted">{r.drawn}</td>
                    <td className="py-3 px-2 text-center text-muted">{r.lost}</td>
                    <td className="py-3 px-2 text-center text-green-400">{r.goal_difference > 0 ? `+${r.goal_difference}` : r.goal_difference}</td>
                    <td className="py-3 px-3 text-center font-bold text-lg font-display italic">{r.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
    </PublicLayout>
  );
}
