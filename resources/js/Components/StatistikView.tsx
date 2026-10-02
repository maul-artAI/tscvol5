
export type StatEntry = {
  name: string;
  team?: { id: number; short_name?: string | null; name: string; logo_url?: string | null } | null;
  goals: number;
  assists: number;
};

export type StatBlock = { scorers: StatEntry[]; assists: StatEntry[] };

function RankTable({ rows, valueKey, valueLabel }: { rows: StatEntry[]; valueKey: "goals" | "assists"; valueLabel: string }) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted bg-surface border border-border rounded-xl p-6 text-center">
        Belum ada data. Mainkan laga dan catat gol/assist dulu.
      </p>
    );
  }
  return (
    <div className="bg-surface border border-border rounded-xl overflow-x-auto">
      <table className="w-full text-sm tabular-nums min-w-[420px]">
        <thead>
          <tr className="text-muted text-xs border-b border-border/50 uppercase">
            <th className="py-2 px-3 text-center w-10">#</th>
            <th className="py-2 px-3 text-left">Pemain</th>
            <th className="py-2 px-3 text-left">Tim</th>
            <th className="py-2 px-3 text-center">G</th>
            <th className="py-2 px-3 text-center">A</th>
            <th className="py-2 px-3 text-center font-bold text-white">{valueLabel}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {rows.map((r, i) => (
            <tr key={`${r.name}-${r.team?.id}`} className="hover:bg-white/5 transition">
              <td className={`py-2.5 px-3 text-center font-bold ${i === 0 ? "text-brand" : ""}`}>{i + 1}</td>
              <td className="py-2.5 px-3 font-medium">{r.name}</td>
              <td className="py-2.5 px-3 text-muted text-xs">
                <span className="flex items-center gap-1.5">
                  {r.team?.logo_url && <img src={r.team.logo_url} alt="" loading="lazy" className="w-4 h-4 rounded-full object-cover" />}
                  {r.team?.short_name || r.team?.name || "-"}
                </span>
              </td>
              <td className="py-2.5 px-3 text-center text-muted">{r.goals}</td>
              <td className="py-2.5 px-3 text-center text-muted">{r.assists}</td>
              <td className="py-2.5 px-3 text-center font-bold text-lg font-display italic">{r[valueKey]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function StatistikView({
  initialSma,
  initialSmp,
}: {
  initialSma: StatBlock;
  initialSmp: StatBlock;
}) {
  return (
    <>
      <div className="grid lg:grid-cols-2 gap-6 mt-6">
        <div>
          <h2 className="font-display italic font-bold text-xl uppercase mb-3">
            <i className="fa-regular fa-futbol text-brand mr-2"></i>Top Skor SMA
          </h2>
          <RankTable rows={initialSma.scorers} valueKey="goals" valueLabel="Gol" />
        </div>
        <div>
          <h2 className="font-display italic font-bold text-xl uppercase mb-3">
            <i className="fa-regular fa-futbol text-brand mr-2"></i>Top Skor SMP
          </h2>
          <RankTable rows={initialSmp.scorers} valueKey="goals" valueLabel="Gol" />
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mt-8">
        <div>
          <h2 className="font-display italic font-bold text-xl uppercase mb-3">
            <i className="fa-solid fa-handshake text-brand mr-2"></i>Top Assist SMA
          </h2>
          <RankTable rows={initialSma.assists} valueKey="assists" valueLabel="Ast" />
        </div>
        <div>
          <h2 className="font-display italic font-bold text-xl uppercase mb-3">
            <i className="fa-solid fa-handshake text-brand mr-2"></i>Top Assist SMP
          </h2>
          <RankTable rows={initialSmp.assists} valueKey="assists" valueLabel="Ast" />
        </div>
      </div>
    </>
  );
}
