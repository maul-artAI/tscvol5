
import { useEffect, useState } from "react";
import { Link } from "@inertiajs/react";
import { apiFetch, revalidateSite, type StandingRow, type Team } from "../../lib/api";
import BracketDiagram, { type BracketRound } from "../../Components/BracketDiagram";
import AdminLayout from "../../Layouts/AdminLayout";

export default function AdminBracketPage() {
  const [cat, setCat] = useState<"SMA" | "SMP">("SMA");
  const [rounds, setRounds] = useState<BracketRound[]>([]);
  const [champion, setChampion] = useState<Team | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState<number | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [group, setGroup] = useState("A");
  const [gtable, setGtable] = useState<StandingRow[]>([]);

  const slotOf = (id?: number | null): string => {
    if (!id) return "";
    for (const r of rounds) {
      const m = r.matches.find((x) => x.id === id);
      if (m) return m.slot || `#${id}`;
    }
    return `#${id}`;
  };

  async function load(c: string) {
    const [b, t, s] = await Promise.all([
      apiFetch<{ data: { rounds: BracketRound[]; champion: Team | null } }>(`/bracket?category=${c}`),
      apiFetch<{ data: Team[] }>(`/teams?category=${c}&active_only=0`),
      apiFetch<{ data: StandingRow[] }>(`/standings?category=${c}`),
    ]);
    setRounds(b.data.rounds);
    setChampion(b.data.champion);
    setTeams(t.data);
    setGtable(s.data);
  }

  useEffect(() => {
    load(cat).catch(() => {});
  }, [cat]);

  async function seedFromGroups() {
    if (!confirm(`Tarik juara + runner-up tiap grup ${cat} ke 16 Besar? Slot yang sudah terisi manual tidak ditimpa.`)) return;
    setSeeding(true);
    setMsg("");
    try {
      const res = await apiFetch<{ message: string }>("/bracket/seed-from-groups", {
        method: "POST",
        body: { category: cat },
      });
      setMsg(res.message);
      revalidateSite(["/bagan"]);
      await load(cat);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Gagal menarik data grup.");
    } finally {
      setSeeding(false);
    }
  }

  async function assignTeam(matchId: number, side: "team1" | "team2", teamId: string) {
    setSaving(matchId);
    setMsg("");
    try {
      await apiFetch(`/matches/${matchId}`, {
        method: "PUT",
        body: { [`${side}_id`]: teamId ? Number(teamId) : null },
      });
      revalidateSite(["/bagan"]);
      await load(cat);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Gagal menyimpan.");
    } finally {
      setSaving(null);
    }
  }

  return (
    <AdminLayout>
    <div>
      <h1 className="font-display italic font-bold text-2xl mb-1">Bagan Knockout</h1>
      <p className="text-sm text-muted mb-5">
        Skeleton ronde sudah tersedia — panitia tinggal mengisi tim ke tiap slot.
        Pemenang laga yang selesai otomatis mengisi slot lanjutan yang masih kosong.
      </p>

      <div className="flex flex-wrap items-center gap-2 mb-5">
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
        <button
          onClick={seedFromGroups}
          disabled={seeding}
          className="px-4 py-2 rounded text-sm font-bold bg-white/10 hover:bg-white/20 disabled:opacity-50 transition"
          title="Isi slot 16 Besar dari juara + runner-up tiap grup (A1 vs B2, B1 vs A2, dst)"
        >
          {seeding ? "Menarik..." : "↓ Tarik dari Fase Grup"}
        </button>
      </div>

      {msg && <p className="mb-4 text-xs bg-white/5 border border-border rounded px-3 py-2">{msg}</p>}

      {/* Fase Grup */}
      <div className="mb-8">
        <h2 className="font-display italic font-bold text-lg uppercase mb-3">
          <span className="text-brand">●</span> Fase Grup
        </h2>
        <div className="flex flex-wrap gap-2 mb-3">
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
              {gtable
                .filter((r) => (r.team.group_name || "") === `Grup ${group}`)
                .map((r) => (
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
        <p className="text-[11px] text-muted mt-2">Dua teratas lolos ke 16 Besar — gunakan tombol di bawah untuk menariknya otomatis.</p>
      </div>

      {champion && (
        <div className="mb-5 bg-gradient-to-r from-brand/20 to-transparent border border-brand/40 rounded-xl p-3 flex items-center gap-3">
          <i className="fa-solid fa-trophy text-brand text-xl"></i>
          <div>
            <div className="text-[11px] font-bold text-muted uppercase">Juara {cat}</div>
            <div className="font-display italic font-bold">{champion.name}</div>
          </div>
        </div>
      )}

      {rounds.length === 0 ? (
        <p className="text-sm text-muted bg-surface border border-border rounded-xl p-6 text-center">
          Belum ada slot bracket untuk {cat}. Buat laga dengan ronde & slot di halaman Jadwal.
        </p>
      ) : (
        <BracketDiagram
          rounds={rounds}
          champion={champion}
          renderTeamRow={(m, side, team) => (
            <select
              value={team?.id ? String(team.id) : ""}
              onChange={(e) => assignTeam(m.id, side, e.target.value)}
              disabled={saving === m.id}
              className="w-full bg-dark border-t border-white/5 px-3 py-2 text-xs outline-none focus:border-brand disabled:opacity-50"
              aria-label={`${side === "team1" ? "Tim 1" : "Tim 2"} slot ${m.slot}`}
            >
              <option value="">— {side === "team1" ? "Tim 1" : "Tim 2"}: kosong (TBD) —</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.short_name || t.name} — {t.name}
                </option>
              ))}
            </select>
          )}
          renderCardFooter={(m) => (
            <div className="flex items-center justify-between px-3 py-1.5 border-t border-white/5">
              <span className="text-[11px] text-muted">
                {m.winner_next_match_id ? (
                  <>Pemenang → {slotOf(m.winner_next_match_id)} ({m.winner_next_side === "team1" ? "Tim 1" : "Tim 2"})</>
                ) : (
                  "Tanpa lanjutan"
                )}
              </span>
              <Link href={`/admin/matches/${m.id}`} className="text-[11px] text-muted hover:text-white">
                Kelola <i className="fa-solid fa-arrow-right text-[10px]"></i>
              </Link>
            </div>
          )}
        />
      )}
    </div>
    </AdminLayout>
  );
}