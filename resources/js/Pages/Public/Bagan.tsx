
import { useState } from "react";
import type { StandingRow, Team } from "../../lib/api";
import BracketDiagram, { type BracketRound } from "../../Components/BracketDiagram";
import PublicLayout from "../../Layouts/PublicLayout";
import Reveal from "../../Components/Reveal";

type Brackets = Partial<
  Record<"SMA" | "SMP", { rounds: BracketRound[]; champion: Team | null; third: Team | null }>
>;
type Tables = Partial<Record<"SMA" | "SMP", Record<string, StandingRow[]>>>;

export default function BaganPage({ brackets }: { brackets: Brackets; tables?: Tables }) {
  const [cat, setCat] = useState<"SMA" | "SMP">("SMA");

  const rounds = brackets[cat]?.rounds || [];
  const champion = brackets[cat]?.champion || null;
  const third = brackets[cat]?.third || null;

  return (
    <PublicLayout>
    <main className="min-h-screen bg-dark text-white">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Reveal>
        <h1 className="font-display italic font-bold text-4xl md:text-5xl uppercase mt-3">
          Bracket <span className="text-brand">Knockout</span>
        </h1>
        <p className="text-sm text-muted mt-2">Pemenang tiap laga otomatis maju ke babak berikutnya.</p>
        </Reveal>

        <Reveal delay={120}>

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

        {rounds.length === 0 ? (
          <p className="text-sm text-muted">Memuat bracket...</p>
        ) : (
          <>
            {rounds.length === 0 ? (
              <p className="text-sm text-muted bg-surface border border-border rounded-xl p-6 text-center">
                Bracket knockout {cat} belum disusun.
              </p>
            ) : (
              <BracketDiagram rounds={rounds} champion={champion} third={third} />
            )}
          </>
        )}
        </Reveal>
      </div>
    </main>
    </PublicLayout>
  );
}
