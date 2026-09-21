import { Link } from "@inertiajs/react";
import type { Team } from "../../lib/api";
import PublicLayout from "../../Layouts/PublicLayout";

const ORDER: string[] = [];
(["SMA", "SMP"] as const).forEach((c) => {
  ["A", "B", "C", "D", "E", "F", "G", "H"].forEach((g) => ORDER.push(`${c} • Grup ${g}`));
});

export default function TimPage({ teams }: { teams: Team[] }) {
  const groups = new Map<string, Team[]>();
  teams.forEach((t) => {
    const key = `${t.category} • ${t.group_name || "Tanpa Grup"}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(t);
  });
  const ordered = ORDER.filter((k) => groups.has(k)).concat(
    [...groups.keys()].filter((k) => !ORDER.includes(k))
  );

  return (
    <PublicLayout>
    <main className="min-h-screen bg-dark text-white">
      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="font-display italic font-bold text-4xl md:text-5xl uppercase mt-3">
          Daftar <span className="text-brand">Tim</span>
        </h1>
        <p className="text-sm text-muted mt-2">{teams.length} tim peserta.</p>

        {teams.length === 0 ? (
          <p className="text-sm text-muted mt-6">Belum ada data tim.</p>
        ) : (
          ordered.map((key) => (
            <section key={key} className="mt-8">
              <h2 className="font-display italic font-bold text-xl uppercase mb-3">
                <span className="text-brand">●</span> {key}
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {groups.get(key)!.map((t) => (
                  <Link
                    key={t.id}
                    href={`/tim/${t.id}`}
                    className="bg-surface border border-border rounded-xl p-4 hover:border-brand/60 transition group text-center"
                  >
                    {t.logo_url ? (
                      <img
                        src={t.logo_url}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="w-14 h-14 rounded-full object-cover bg-white/10 mx-auto mb-2"
                      />
                    ) : (
                      <span className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center text-muted mx-auto mb-2 text-xl">
                        <i className="fa-solid fa-shield-halved"></i>
                      </span>
                    )}
                    <div className="font-bold text-sm leading-tight group-hover:text-brand transition">{t.name}</div>
                    <div className="text-[11px] text-muted mt-1">{t.short_name || ""}</div>
                  </Link>
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </main>
    </PublicLayout>
  );
}
