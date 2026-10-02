
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@inertiajs/react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { apiFetch, revalidateSite, type StandingRow, type Team } from "../../lib/api";
import BracketDiagram, { isPenaltyDecided, winnerOf, type BracketRound } from "../../Components/BracketDiagram";
import AdminLayout from "../../Layouts/AdminLayout";
import { useFeedback } from "../../Components/Feedback";

type InitialBracket = { rounds: BracketRound[]; champion: Team | null };

const MONTHS_ID = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

function fmtRingkas(match_date?: string | null, kickoff?: string | null): string {
  if (!match_date) return "";
  const d = new Date(`${match_date.slice(0, 10)}T00:00:00`);
  const tgl = isNaN(+d) ? match_date.slice(0, 10) : `${d.getDate()} ${MONTHS_ID[d.getMonth()]}`;
  return kickoff ? `${tgl} • ${kickoff.slice(0, 5)}` : tgl;
}

/** Chip tim di palet (draggable). */
function TeamChip({ team, placed }: { team: Team; placed: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `team:${team.id}`,
  });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      title={team.name}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold border cursor-grab active:cursor-grabbing touch-none select-none transition ${
        isDragging
          ? "opacity-40 border-brand"
          : placed
            ? "bg-brand/10 border-brand/40 text-white"
            : "bg-dark border-border text-muted hover:text-white hover:border-brand/50"
      }`}
    >
      <span className="truncate">{team.short_name || team.name}</span>
      {placed && <i className="fa-solid fa-check text-[10px] text-brand shrink-0"></i>}
    </div>
  );
}

/** Satu kelompok palet (juara / runner-up / lainnya). */
function QualGroup({
  title,
  icon,
  rows,
  slottedIds,
  emptyText,
}: {
  title: string;
  icon: string;
  rows: StandingRow[];
  slottedIds: Set<number>;
  emptyText: string;
}) {
  return (
    <div className="mb-3 last:mb-0">
      <h4 className="text-[11px] font-bold tracking-widest text-muted uppercase mb-1.5">
        <i className={`${icon} text-brand mr-1.5`}></i>{title} ({rows.length})
      </h4>
      {rows.length === 0 ? (
        <p className="text-[11px] text-muted/70 italic">{emptyText}</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {rows.map((r) => (
            <span key={r.team.id} className="flex flex-col">
              <TeamChip team={r.team} placed={slottedIds.has(r.team.id)} />
              <span className="text-[10px] text-muted mt-0.5 pl-0.5">
                {title.includes("Juara") ? "Juara" : title.includes("Runner") ? "Runner-up" : ""} {r.team.group_name || ""}
              </span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** Satu sisi slot laga (drop target). */
function SlotTarget({
  matchId,
  slot,
  side,
  team,
  busy,
  onClear,
  score,
  pen,
  showPen,
  won,
}: {
  matchId: number;
  slot?: string | null;
  side: "team1" | "team2";
  team?: { id: number; short_name?: string | null; name: string } | null;
  busy: boolean;
  onClear: () => void;
  score?: number;
  pen?: number | null;
  showPen?: boolean;
  won?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `slot:${matchId}:${side}` });
  return (
    <div
      ref={setNodeRef}
      className={`w-full px-3 py-2 text-xs border-t border-white/5 flex items-center gap-2 transition ${
        isOver ? "bg-brand/15 ring-2 ring-inset ring-brand" : ""
      } ${busy ? "opacity-50 pointer-events-none" : ""}`}
      aria-label={`${side === "team1" ? "Tim 1" : "Tim 2"} slot ${slot || ""}: seret tim ke sini`}
    >
      {team?.id ? (
        <>
          <span className="flex-1 truncate font-semibold text-white">
            {team.short_name || team.name}
          </span>
          {showPen && (
            <span className="text-[9px] font-bold bg-white/10 text-gray-300 px-1.5 py-0.5 rounded shrink-0">PEN</span>
          )}
          {score !== undefined && (
            <span className="tabular-nums font-bold text-muted shrink-0">
              {score}
              {showPen && pen !== null && pen !== undefined && (
                <span className="text-amber-400"> ({pen})</span>
              )}
            </span>
          )}
          {won && <i className="fa-solid fa-check text-green-400 text-xs shrink-0"></i>}
          <button
            onClick={onClear}
            className="text-muted hover:text-red-400 transition shrink-0"
            title="Kosongkan slot"
            aria-label="Kosongkan slot"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </>
      ) : (
        <span className="text-muted/60 italic">— {side === "team1" ? "Tim 1" : "Tim 2"}: seret tim ke sini (TBD) —</span>
      )}
    </div>
  );
}

export default function AdminBracketPage({ initialCategory, initialBracket, initialBracketTeams, initialStandings }: { initialCategory?: "SMA" | "SMP"; initialBracket?: InitialBracket; initialBracketTeams?: Team[]; initialStandings?: StandingRow[] }) {
  const [cat, setCat] = useState<"SMA" | "SMP">(initialCategory ?? "SMA");
  const [rounds, setRounds] = useState<BracketRound[]>(initialBracket?.rounds ?? []);
  const [champion, setChampion] = useState<Team | null>(initialBracket?.champion ?? null);
  const [teams, setTeams] = useState<Team[]>(initialBracketTeams ?? []);
  const [saving, setSaving] = useState<number | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [group, setGroup] = useState("A");
  const { toast, confirmDlg } = useFeedback();
  const [gtable, setGtable] = useState<StandingRow[]>(initialStandings ?? []);
  const [dragTeam, setDragTeam] = useState<Team | null>(null);
  const [schedTarget, setSchedTarget] = useState<{
    id: number; slot: string; label: string;
    team1: string; team2: string; match_date: string; kickoff: string;
  } | null>(null);
  const [schedDate, setSchedDate] = useState("");
  const [schedTime, setSchedTime] = useState("");
  const [schedSaving, setSchedSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  // Kelompok lolos per grup: juara (posisi 1) & runner-up (posisi 2).
  // rows() terurut global per kriteria yang sama → urutan dalam grup = peringkat grup.
  const qualified = useMemo(() => {
    const byGroup = new Map<string, StandingRow[]>();
    for (const r of gtable) {
      const g = r.team.group_name || "";
      if (!g) continue;
      if (!byGroup.has(g)) byGroup.set(g, []);
      byGroup.get(g)!.push(r);
    }
    const winners: StandingRow[] = [];
    const runners: StandingRow[] = [];
    const others: StandingRow[] = [];
    [...byGroup.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([, rows]) => {
        rows.forEach((r, i) => {
          if (i === 0) winners.push(r);
          else if (i === 1) runners.push(r);
          else others.push(r);
        });
      });
    return { winners, runners, others };
  }, [gtable]);

  // ID tim yang sudah terpasang di slot mana pun (penanda di palet).
  const slottedIds = useMemo(() => {    const ids = new Set<number>();
    for (const r of rounds) {
      for (const m of r.matches) {
        const t1 = (m as { team1?: { id?: number } | null }).team1;
        const t2 = (m as { team2?: { id?: number } | null }).team2;
        if (t1?.id) ids.add(t1.id);
        if (t2?.id) ids.add(t2.id);
      }
    }
    return ids;
  }, [rounds]);

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

  const firstBracketLoad = useRef(true);
  useEffect(() => {
    if (firstBracketLoad.current) {
      firstBracketLoad.current = false;
      if (initialBracket !== undefined) return;
    }
    load(cat).catch(() => {});
  }, [cat]);

  async function seedFromGroups() {
    const okSeed = await confirmDlg({
      title: `Tarik juara + runner-up grup ${cat}?`,
      detail: "Slot 16 Besar yang masih kosong akan diisi otomatis. Slot yang sudah terisi manual tidak ditimpa.",
      confirmLabel: "Ya, Tarik",
    });
    if (!okSeed) return;
    setSeeding(true);
    try {
      const res = await apiFetch<{ message: string }>("/bracket/seed-from-groups", {
        method: "POST",
        body: { category: cat },
      });
      toast.success(res.message);
      revalidateSite(["/bagan"]);
      await load(cat);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menarik data grup.");
    } finally {
      setSeeding(false);
    }
  }

  async function assignTeam(matchId: number, side: "team1" | "team2", teamId: string) {
    setSaving(matchId);
    try {
      await apiFetch(`/matches/${matchId}`, {
        method: "PUT",
        body: { [`${side}_id`]: teamId ? Number(teamId) : null },
      });
      revalidateSite(["/bagan"]);
      await load(cat);
      const t = teams.find((x) => String(x.id) === String(teamId));
      toast.success(teamId ? `${t?.short_name || t?.name || "Tim"} → slot ${slotOf(matchId)}, tersinkron ke jadwal.` : `Slot ${slotOf(matchId)} dikosongkan (TBD), tersinkron ke jadwal.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan.");
    } finally {
      setSaving(null);
    }
  }

  async function setLapangan(matchId: number, lapangan: string) {
    setSaving(matchId);
    try {
      await apiFetch(`/matches/${matchId}`, { method: "PUT", body: { lapangan } });
      revalidateSite(["/", "/jadwal"]);
      await load(cat);
      toast.success(`Slot ${slotOf(matchId)} → ${lapangan}, tersinkron ke jadwal.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan lapangan.");
    } finally {
      setSaving(null);
    }
  }

  async function openSched(m: { id: number; slot?: string | null; round_label?: string | null; match_date?: string | null; kickoff?: string | null; team1?: { short_name?: string | null; name?: string } | null; team2?: { short_name?: string | null; name?: string } | null }) {
    setSchedTarget({
      id: m.id,
      slot: m.slot || `#${m.id}`,
      label: m.round_label || "Knockout",
      team1: m.team1?.short_name || m.team1?.name || "TBD",
      team2: m.team2?.short_name || m.team2?.name || "TBD",
      match_date: (m.match_date || "").slice(0, 10),
      kickoff: (m.kickoff || "").slice(0, 5),
    });
    setSchedDate((m.match_date || "").slice(0, 10));
    setSchedTime((m.kickoff || "").slice(0, 5));
  }

  async function saveSched(e: React.FormEvent) {
    e.preventDefault();
    if (!schedTarget) return;
    if (!schedDate) {
      toast.error("Tanggal wajib diisi.");
      return;
    }
    setSchedSaving(true);
    try {
      await apiFetch(`/matches/${schedTarget.id}`, {
        method: "PUT",
        body: { match_date: schedDate, kickoff: schedTime || null },
      });
      revalidateSite(["/", "/jadwal"]);
      await load(cat);
      setSchedTarget(null);
      toast.success("Jadwal pertandingan berhasil disimpan.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan jadwal.");
    } finally {
      setSchedSaving(false);
    }
  }

  function handleDragStart(e: DragStartEvent) {
    const id = String(e.active.id);
    if (!id.startsWith("team:")) return;
    setDragTeam(teams.find((t) => String(t.id) === id.slice(5)) || null);
  }

  function handleDragEnd(e: DragEndEvent) {
    const team = dragTeam;
    setDragTeam(null);
    const over = e.over ? String(e.over.id) : "";
    if (!team || !over.startsWith("slot:")) return;
    const [, matchId, side] = over.split(":");
    if (side !== "team1" && side !== "team2") return;
    // Cegah ganda dalam satu ronde: tim yang sama tak boleh di dua slot.
    const round = rounds.find((r) => r.matches.some((m) => String(m.id) === matchId));
    const dup = round?.matches.find(
      (m) =>
        String(m.id) !== matchId &&
        (m.team1?.id === team.id || m.team2?.id === team.id)
    );
    if (dup) {
      toast.error(`${team.short_name || team.name} sudah terpasang di slot ${dup.slot || ""} pada babak ini.`);
      return;
    }
    assignTeam(Number(matchId), side, String(team.id)).catch(() => {});
  }

  return (
    <AdminLayout>
    <div>
      <h1 className="font-display italic font-bold text-2xl mb-1">Bracket Knockout</h1>
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
                <th className="py-2 px-1 text-center">GM</th>
                <th className="py-2 px-1 text-center">GK</th>
                <th className="py-2 px-1 text-center">SG</th>
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
                    <td className="py-2.5 px-1 text-center tabular-nums">{r.goals_for}</td>
                    <td className="py-2.5 px-1 text-center text-muted tabular-nums">{r.goals_against}</td>
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
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={() => setDragTeam(null)}>
          {/* Palet tim lolos — seret ke slot */}
          <div className="bg-surface border border-border rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-sm uppercase tracking-wide">
                <i className="fa-solid fa-grip-vertical text-brand mr-2"></i>Daftar Tim Lolos {cat}
              </h3>
              <span className="text-[11px] text-muted">seret ke slot • centang = sudah terpasang</span>
            </div>
            <p className="text-[11px] text-muted mb-3">Otomatis dari klasemen fase grup. Di layar sentuh: tahan lalu seret.</p>
            {gtable.length === 0 ? (
              <p className="text-xs text-muted">Belum ada data klasemen {cat}.</p>
            ) : (
              <>
                <QualGroup title="Juara Grup" icon="fa-solid fa-crown" rows={qualified.winners} slottedIds={slottedIds} emptyText="Belum ada juara grup." />
                <QualGroup title="Runner-up" icon="fa-solid fa-medal" rows={qualified.runners} slottedIds={slottedIds} emptyText="Belum ada runner-up." />
                {qualified.others.length > 0 && (
                  <details>
                    <summary className="text-[11px] font-bold tracking-widest text-muted uppercase cursor-pointer hover:text-white">
                      Tim lainnya ({qualified.others.length})
                    </summary>
                    <div className="mt-1.5">
                      <QualGroup title="Peringkat 3+" icon="fa-solid fa-list" rows={qualified.others} slottedIds={slottedIds} emptyText="" />
                    </div>
                  </details>
                )}
              </>
            )}
          </div>
          <BracketDiagram
            rounds={rounds}
            champion={champion}
            renderTeamRow={(m, side, team) => (
              <SlotTarget
                matchId={m.id}
                slot={m.slot}
                side={side}
                team={team}
                busy={saving === m.id}
                onClear={() => assignTeam(m.id, side, "")}
                score={side === "team1" ? m.team1_score : m.team2_score}
                pen={side === "team1" ? m.penalty1 : m.penalty2}
                showPen={isPenaltyDecided(m)}
                won={winnerOf(m) === (side === "team1" ? 1 : 2)}
              />
            )}
            renderCardFooter={(m) => (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-1.5 border-t border-white/5">
                <button
                  onClick={() => openSched(m)}
                  className="flex items-center gap-1.5 text-[11px] text-muted hover:text-white transition"
                  title="Atur tanggal & jam kick-off"
                >
                  <i className="fa-regular fa-calendar-days"></i>
                  {fmtRingkas(m.match_date, m.kickoff) || "Atur Waktu"}
                </button>
                <label className="flex items-center gap-1.5 text-[11px] text-muted">
                  <i className="fa-solid fa-location-dot"></i>
                  <select
                    value={m.lapangan || "Lapangan 1"}
                    onChange={(e) => setLapangan(m.id, e.target.value)}
                    disabled={saving === m.id}
                    className="bg-dark border border-border rounded px-1.5 py-0.5 text-[11px] outline-none focus:border-brand disabled:opacity-50"
                    aria-label={`Lapangan slot ${m.slot}`}
                  >
                    <option value="Lapangan 1">Lapangan 1</option>
                    <option value="Lapangan 2">Lapangan 2</option>
                  </select>
                </label>
                <span className="text-[11px] text-muted">
                  {m.winner_next_match_id ? (
                    <>Pemenang → {slotOf(m.winner_next_match_id)} ({m.winner_next_side === "team1" ? "Tim 1" : "Tim 2"})</>
                  ) : (
                    "Tanpa lanjutan"
                  )}
                </span>
                <Link href={`/admin/matches/${m.id}`} className="ml-auto text-[11px] text-muted hover:text-white">
                  Kelola <i className="fa-solid fa-arrow-right text-[10px]"></i>
                </Link>
              </div>
            )}
          />
          <DragOverlay dropAnimation={null}>
            {dragTeam ? (
              <div className="px-3 py-2 rounded-lg text-xs font-bold bg-brand text-white shadow-2xl cursor-grabbing">
                {dragTeam.short_name || dragTeam.name}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Modal atur jadwal slot */}
      {schedTarget && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setSchedTarget(null)}></div>
          <form
            onSubmit={saveSched}
            className="relative w-full max-w-sm bg-surface border border-border rounded-2xl p-5 shadow-2xl"
          >
            <div className="w-11 h-11 rounded-full bg-brand/15 text-brand flex items-center justify-center text-lg mb-3">
              <i className="fa-regular fa-calendar-days"></i>
            </div>
            <h3 className="font-bold text-white">Atur Jadwal: {schedTarget.label} ({schedTarget.slot})</h3>
            <p className="text-sm text-muted mt-1">{schedTarget.team1} vs {schedTarget.team2}</p>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">TANGGAL</label>
                <input
                  type="date"
                  value={schedDate}
                  onChange={(e) => setSchedDate(e.target.value)}
                  className="w-full bg-dark border border-border rounded px-3 py-2 text-sm outline-none focus:border-brand"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">JAM KICK-OFF</label>
                <input
                  type="time"
                  value={schedTime}
                  onChange={(e) => setSchedTime(e.target.value)}
                  className="w-full bg-dark border border-border rounded px-3 py-2 text-sm outline-none focus:border-brand"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button
                type="button"
                onClick={() => setSchedTarget(null)}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white text-sm font-bold py-2.5 rounded-lg transition"
              >
                Batal
              </button>
              <button
                disabled={schedSaving}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-bold py-2.5 rounded-lg transition"
              >
                {schedSaving ? "Menyimpan..." : "Simpan Jadwal"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
    </AdminLayout>
  );
}