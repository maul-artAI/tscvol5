import PublicLayout from "../../Layouts/PublicLayout";
import Reveal from "../../Components/Reveal";
import StatistikView from "../../Components/StatistikView";
import type { StatEntry } from "../../Components/StatistikView";
export type StatBlock = { scorers: StatEntry[]; assists: StatEntry[] };

export default function StatistikPage({ initial, initialSmp }: { initial: StatBlock; initialSmp?: StatBlock }) {
  const sma = initial || { scorers: [], assists: [] };
  const smp = initialSmp || { scorers: [], assists: [] };

  return (
    <PublicLayout>
    <main className="min-h-screen bg-dark text-white">
      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Reveal>
        <h1 className="font-display italic font-bold text-4xl md:text-5xl uppercase mt-3">
          Statistik <span className="text-brand">Pemain</span>
        </h1>
        <p className="text-sm text-muted mt-2">Top skor & assist terhitung otomatis dari event pertandingan.</p>
        </Reveal>

        <Reveal delay={120}>
        <StatistikView initialSma={sma} initialSmp={smp} />
        </Reveal>
      </div>
    </main>
    </PublicLayout>
  );
}
