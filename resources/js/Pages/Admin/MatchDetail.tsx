import { useEffect, useRef, useState } from "react";
import { apiFetch, revalidateSite, type MatchEvent, type TournamentMatch } from "../../lib/api";
import { getEcho, onConnectionChange, type LiveMatch } from "../../lib/echo";
import BackButton from "../../Components/BackButton";
import AdminLayout from "../../Layouts/AdminLayout";
import { useFeedback } from "../../Components/Feedback";
import {
  ClockField,
  MatchTimer,
  PeriodChips,
  ScoreStepper,
  StatusSegment,
} from "../../Components/live-controls";

const TYPE_LABEL: Record<string, string> = { goal: "Gol", own_goal: "Own Goal", shootout_goal: "Gol Penalti", shootout_miss: "Penalti Gagal", wo_call: "Panggilan WO", yellow_card: "Kartu Kuning", red_card: "Kartu Merah", foul: "Pelanggaran" };

type Side = "team1" | "team2";

type SquadPlayer = { id: number; name: string; jersey_number?: number | null };

/** Dropdown pemain roster, fallback ketik manual bila skuad kosong. */
function PlayerPick({
  players,
  value,
  onChange,
  id,
}: {
  players: SquadPlayer[];
  value: string;
  onChange: (v: string) => void;
  id?: string;
}) {
  const cls =
    "w-full bg-dark border border-border rounded px-3 py-2 text-sm outline-none focus:border-brand";
  if (players.length > 0) {
    return (
      <select id={id} className={cls} value={value} onChange={(e) => onChange(e.target.value)} required>
        <option value="">-- Pilih pemain --</option>
        {players.map((p) => (
          <option key={p.id} value={p.name}>
            {p.jersey_number ? `#${p.jersey_number} ` : ""}{p.name}
          </option>
        ))}
      </select>
    );
  }
  return (
    <input
      id={id}
      className={cls}
      placeholder="Nama pemain (skuad kosong)"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required
    />
  );
}

export default function AdminMatchDetailPage({ id, initialMatch, initialSquad }: { id: number; initialMatch?: TournamentMatch | null; initialSquad?: Record<string, SquadPlayer[]> }) {
  const [match, setMatch] = useState<TournamentMatch | null>(initialMatch ?? null);
  const [live, setLive] = useState<{ team1_score: number; team2_score: number; status: string; period: string; clock: string; penalty1: number | null; penalty2: number | null }>({
    team1_score: initialMatch?.team1_score ?? 0,
    team2_score: initialMatch?.team2_score ?? 0,
    status: initialMatch?.status ?? "scheduled",
    period: initialMatch?.period ?? "",
    clock: initialMatch?.clock_display || initialMatch?.clock || "",
    penalty1: initialMatch?.penalty1 ?? null,
    penalty2: initialMatch?.penalty2 ?? null,
  });
  const isKnockout = (match?.round_order ?? 0) > 0 || !!match?.slot;
  const isDraw = live.team1_score === live.team2_score;

  // Modal gol cepat (waktu normal)
  const [goalModal, setGoalModal] = useState<null | { side: Side }>(null);
  const [gMinute, setGMinute] = useState("");
  const [gScorer, setGScorer] = useState("");
  const [gAssist, setGAssist] = useState("");
  const [gKind, setGKind] = useState<"biasa" | "penalti" | "own">("biasa");
  // Modal eksekutor penalti (shootout)
  const [penModal, setPenModal] = useState<null | { side: Side }>(null);
  const [pPlayer, setPPlayer] = useState("");
  const [pMinute, setPMinute] = useState("");
  const [pStatus, setPStatus] = useState<"shootout_goal" | "shootout_miss">("shootout_goal");
  // Modal aksi cepat (kartu/foul/penalti gagal)
  const [actModal, setActModal] = useState<null | { kind: "yellow_card" | "red_card" | "shootout_miss"; side: Side }>(null);
  const [aPlayer, setAPlayer] = useState("");
  const [aMinute, setAMinute] = useState("");
  const [modalSaving, setModalSaving] = useState(false);
  const [woSide, setWoSide] = useState<Side>("team1");
  const [woSaving, setWoSaving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [online, setOnline] = useState(true);
  const [savedAt, setSavedAt] = useState("");
  const { toast, confirmDlg } = useFeedback();
  const [ev, setEv] = useState({ minute: "", team_side: "team1", type: "goal", player_name: "", assist_name: "" });
  const clockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const busy = useRef(false);

  // Skuad kedua tim untuk dropdown pemain (sinkron data pemain).
  const [squad, setSquad] = useState<Record<string, SquadPlayer[]>>(initialSquad ?? { team1: [], team2: [] });
  const firstSquadLoad = useRef(true);

  useEffect(() => {
    if (!match?.team1_id && !match?.team2_id) return;
    if (firstSquadLoad.current) {
      firstSquadLoad.current = false;
      if (initialSquad !== undefined) return;
    }
    (async () => {
      const out: Record<string, SquadPlayer[]> = { team1: [], team2: [] };
      await Promise.all(
        (["team1", "team2"] as const).map(async (side) => {
          const tid = side === "team1" ? match?.team1_id : match?.team2_id;
          if (!tid) return;
          try {
            const res = await apiFetch<{ data: SquadPlayer[] }>(`/teams/${tid}/players`);
            out[side] = res.data;
          } catch {
            /* tim tanpa skuad: fallback ketik manual */
          }
        })
      );
      setSquad(out);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match?.team1_id, match?.team2_id]);

  async function load(syncForm: boolean) {
    const res = await apiFetch<{ data: TournamentMatch }>(`/matches/${id}`);
    setMatch(res.data);
    if (syncForm) {
      setLive({
        team1_score: res.data.team1_score,
        team2_score: res.data.team2_score,
        status: res.data.status,
        period: res.data.period || "",
        clock: res.data.clock_display || res.data.clock || "",
        penalty1: res.data.penalty1 ?? null,
        penalty2: res.data.penalty2 ?? null,
      });
    }
  }

  useEffect(() => {
    if (initialMatch !== undefined) return;
    load(true).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Realtime via socket: refresh saat ada perubahan (dari operator lain),
  // tanpa interval polling. Form yang sedang diketik tidak tersentuh.
  useEffect(() => {
    const off = onConnectionChange(setOnline);
    const echo = getEcho();
    echo?.channel("scores").listen(".match.updated", (e: { match: LiveMatch }) => {
      if (!e?.match || Number(e.match.id) !== Number(id)) return;
      if (busy.current || document.activeElement?.id === "live-clock") {
        load(false).catch(() => {});
      } else {
        load(true).catch(() => {});
      }
    });
    return () => {
      off();
      echo?.leaveChannel("scores");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  /** Simpan otomatis (optimistic). Jam hanya ikut bila withClock (koreksi manual). */
  async function save(patch: Partial<typeof live>, opts?: { withClock?: boolean }) {
    const next = { ...live, ...patch };
    setLive(next);
    busy.current = true;
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        team1_score: Number(next.team1_score),
        team2_score: Number(next.team2_score),
        penalty1: next.penalty1,
        penalty2: next.penalty2,
        status: next.status,
        period: next.period || null,
      };
      if (opts?.withClock) body.clock = next.clock || null;
      const res = await apiFetch<{ data: TournamentMatch }>(`/matches/${id}/live`, {
        method: "PATCH",
        body,
      });
      setMatch(res.data);
      revalidateSite(["/"]);
      setSavedAt(new Date().toLocaleTimeString("id-ID"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan.");
      await load(true).catch(() => {});
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }

  /** Ketikan jam di-debounce agar tidak PATCH tiap karakter. */
  function onClockType(v: string) {
    setLive((l) => ({ ...l, clock: v }));
    if (clockTimer.current) clearTimeout(clockTimer.current);
    clockTimer.current = setTimeout(() => save({ clock: v }, { withClock: true }), 900);
  }

  /** Menit timer berjalan (sumber tunggal untuk menit event). */
  function timerMinute(): string {
    const m = (match?.clock_display || live.clock || "").match(/^(\d+)/);
    return m ? m[1] : "";
  }

  /** Stepper skor utama: [+] buka modal pencetak gol (skor naik saat
      disimpan), [-] koreksi langsung. */
  function stepScore(side: Side, v: number) {
    const cur = side === "team1" ? live.team1_score : live.team2_score;
    if (v > cur) {
      openGoalModal(side);
    } else if (v < cur) {
      if (side === "team1") save({ team1_score: v });
      else save({ team2_score: v });
    }
  }

  /** Buka modal gol cepat: menit otomatis dari timer, bisa diedit. */
  function openGoalModal(side: Side) {
    setGMinute(timerMinute());
    setGScorer("");
    setGAssist("");
    setGKind("biasa");
    setGoalModal({ side });
  }

  /** Simpan gol + tambah skor. Penalti waktu normal & gol biasa masuk top skor; bunuh diri tidak. */
  async function submitGoalModal(e: React.FormEvent) {
    e.preventDefault();
    if (!goalModal || !gScorer.trim()) return;
    const side = goalModal.side;
    setModalSaving(true);
    try {
      if (side === "team1") await save({ team1_score: live.team1_score + 1 });
      else await save({ team2_score: live.team2_score + 1 });
      await apiFetch(`/matches/${id}/events`, {
        method: "POST",
        body: {
          team_side: side,
          minute: Number(gMinute) || 0,
          type: gKind === "own" ? "own_goal" : "goal",
          player_name: gScorer.trim(),
          assist_name: gKind === "own" ? null : gAssist.trim() || null,
        },
      });
      revalidateSite(["/"]);
      await load(false);
      setGoalModal(null);
      toast.success("Gol tercatat.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mencatat gol.");
    } finally {
      setModalSaving(false);
    }
  }

  /** Stepper penalti: [-] koreksi langsung; [+] buka modal eksekutor
      (skor bertambah otomatis saat event gol tersimpan). */
  function penScore(side: Side, d: number) {
    if (d > 0) {
      setPPlayer("");
      setPMinute(timerMinute());
      setPStatus("shootout_goal");
      setPenModal({ side });
      return;
    }
    const cur = side === "team1" ? live.penalty1 ?? 0 : live.penalty2 ?? 0;
    const next = Math.max(0, cur + d);
    if (side === "team1") save({ penalty1: next });
    else save({ penalty2: next });
  }

  async function submitPenModal(e: React.FormEvent) {
    e.preventDefault();
    if (!penModal || !pPlayer.trim()) return;
    setModalSaving(true);
    try {
      await apiFetch(`/matches/${id}/events`, {
        method: "POST",
        body: { team_side: penModal.side, minute: Number(pMinute) || 0, period: live.period || null, type: pStatus, player_name: pPlayer.trim() },
      });
      if (pStatus === "shootout_goal") {
        setLive((l) => ({
          ...l,
          penalty1: penModal.side === "team1" ? (l.penalty1 ?? 0) + 1 : l.penalty1,
          penalty2: penModal.side === "team2" ? (l.penalty2 ?? 0) + 1 : l.penalty2,
        }));
      }
      revalidateSite(["/"]);
      await load(false);
      setPenModal(null);
      toast.success(pStatus === "shootout_goal" ? "Gol penalti tercatat." : "Penalti gagal tercatat.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mencatat.");
    } finally {
      setModalSaving(false);
    }
  }

  /** Aksi cepat: menit otomatis saat tombol ditekan. */
  function openAction(kind: "yellow_card" | "red_card" | "shootout_miss", side: Side) {
    setAPlayer("");
    setAMinute(timerMinute());
    setActModal({ kind, side });
  }

  async function submitAction(e: React.FormEvent) {
    e.preventDefault();
    if (!actModal || !aPlayer.trim()) return;
    setModalSaving(true);
    try {
      await apiFetch(`/matches/${id}/events`, {
        method: "POST",
        body: { team_side: actModal.side, minute: Number(aMinute) || 0, period: live.period || null, type: actModal.kind, player_name: aPlayer.trim() },
      });
      revalidateSite(["/"]);
      await load(false);
      setActModal(null);
      toast.success("Event tercatat.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mencatat.");
    } finally {
      setModalSaving(false);
    }
  }

  const foulCount = (side: Side) => {
    const per = live.period || "";
    const n = (match?.events || []).filter((t) => t.team_side === side && t.type === "foul" && (t.period || "") === per).length;
    return n % 6;
  };

  const foulTotal = (side: Side) => {
    const per = live.period || "";
    return (match?.events || []).filter((t) => t.team_side === side && t.type === "foul" && (t.period || "") === per).length;
  };

  /** Foul tim: sekali klik langsung tercatat (tanpa nama pemain). */
  async function recordTeamFoul(side: Side) {
    const teamLabel = side === "team1" ? match?.team1?.short_name || match?.team1?.name || "Tim 1" : match?.team2?.short_name || match?.team2?.name || "Tim 2";
    const before = foulTotal(side);
    try {
      await apiFetch(`/matches/${id}/events`, {
        method: "POST",
        body: { team_side: side, minute: Number(timerMinute()) || 0, period: live.period || null, type: "foul", player_name: teamLabel },
      });
      revalidateSite(["/"]);
      await load(false);
      const n = before + 1;
      if (n % 6 === 0) toast.error(`Foul ke-${n} ${teamLabel} — tendangan penalti! Counter di-reset.`);
      else toast.success(`Foul ${teamLabel} tercatat (${n % 6}/6).`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mencatat foul.");
    }
  }

  const woCalls = (match?.events || []).filter((t) => t.type === "wo_call" && t.team_side === woSide);
  const woDone = woCalls.length >= 3;

  /** Panggilan WO progresif: +1 skor tiap tekan; panggilan ke-3 menyelesaikan laga. */
  async function recordWoCall() {
    const n = woCalls.length + 1;
    if (n > 3) return;
    setWoSaving(true);
    try {
      const s1 = woSide === "team1" ? live.team1_score + 1 : live.team1_score;
      const s2 = woSide === "team2" ? live.team2_score + 1 : live.team2_score;
      const final = n >= 3;
      await apiFetch(`/matches/${id}/events`, {
        method: "POST",
        body: { team_side: woSide, minute: Number(timerMinute()) || 0, type: "wo_call", player_name: `Panggilan ${n}` },
      });
      await apiFetch(`/matches/${id}/live`, {
        method: "PATCH",
        body: final
          ? { team1_score: s1, team2_score: s2, status: "finished", period: "FULL TIME", is_walkover: true }
          : { team1_score: s1, team2_score: s2 },
      });
      revalidateSite(["/"]);
      await load(true);
      toast.success(final ? "WO selesai — laga dimenangkan 3-0." : `Panggilan ${n} tercatat — skor ${s1}-${s2}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mencatat panggilan.");
    } finally {
      setWoSaving(false);
    }
  }

  /** Batalkan WO: hapus event panggilan + kembalikan skor yang diberikan. */
  async function cancelWo() {
    if (woCalls.length === 0) return;
    const ok = await confirmDlg({
      title: "Batalkan WO?",
      detail: `${woCalls.length} panggilan dihapus dan skor WO dikembalikan.`,
      confirmLabel: "Ya, Batalkan",
    });
    if (!ok) return;
    setWoSaving(true);
    try {
      for (const e of woCalls) {
        await apiFetch(`/events/${e.id}`, { method: "DELETE" });
      }
      const s1 = woSide === "team1" ? Math.max(0, live.team1_score - woCalls.length) : live.team1_score;
      const s2 = woSide === "team2" ? Math.max(0, live.team2_score - woCalls.length) : live.team2_score;
      await apiFetch(`/matches/${id}/live`, {
        method: "PATCH",
        body: match?.is_walkover
          ? { team1_score: s1, team2_score: s2, status: "live", is_walkover: false }
          : { team1_score: s1, team2_score: s2 },
      });
      revalidateSite(["/"]);
      await load(true);
      toast.success("WO dibatalkan.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal membatalkan WO.");
    } finally {
      setWoSaving(false);
    }
  }

  async function addEvent(e: React.FormEvent) {
    e.preventDefault();
    try {
      await apiFetch(`/matches/${id}/events`, {
        method: "POST",
        body: { ...ev, minute: Number(ev.minute) },
      });
      if (ev.type === "shootout_goal") {
        const side = ev.team_side as Side;
        setLive((l) => ({
          ...l,
          penalty1: side === "team1" ? (l.penalty1 ?? 0) + 1 : l.penalty1,
          penalty2: side === "team2" ? (l.penalty2 ?? 0) + 1 : l.penalty2,
        }));
      }
      setEv({ minute: "", team_side: "team1", type: "goal", player_name: "", assist_name: "" });
      revalidateSite(["/"]);
      await load(false);
      toast.success("Event dicatat.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mencatat event.");
    }
  }

  /** Sesuaikan angka penalti di form bila event shootout_goal dihapus. */
  function decPenalty(side: string) {
    setLive((l) => ({
      ...l,
      penalty1: side === "team1" ? Math.max(0, (l.penalty1 ?? 0) - 1) : l.penalty1,
      penalty2: side === "team2" ? Math.max(0, (l.penalty2 ?? 0) - 1) : l.penalty2,
    }));
  }

  async function undoLast() {
    const events = [...(match?.events || [])].sort((a, b) => b.id - a.id);
    const last = events[0];
    if (!last) return;
    const okUndo = await confirmDlg({
      title: "Batalkan event terakhir?",
      detail: `Event ${last.minute}' — ${last.player_name} akan dihapus.`,
      confirmLabel: "Ya, Batalkan",
    });
    if (!okUndo) return;
    try {
      await apiFetch(`/events/${last.id}`, { method: "DELETE" });
      if (last.type === "shootout_goal") decPenalty(last.team_side);
      revalidateSite(["/"]);
      await load(false);
      toast.success("Data berhasil dihapus.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus.");
    }
  }

  async function removeEvent(evId: number) {
    const target = (match?.events || []).find((t) => t.id === evId);
    const ok = await confirmDlg({ title: "Hapus Data Ini?", detail: "Event pertandingan ini akan dihapus permanen." });
    if (!ok) return;
    try {
      await apiFetch(`/events/${evId}`, { method: "DELETE" });
      if (target?.type === "shootout_goal") decPenalty(target.team_side);
      revalidateSite(["/"]);
      await load(false);
      toast.success("Data berhasil dihapus.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus.");
    }
  }

  async function finishMatch() {
    const ok = await confirmDlg({
      title: "Selesaikan pertandingan ini?",
      detail: "Status laga menjadi selesai dan pemenang bracket (bila ada) akan dimajukan otomatis.",
      confirmLabel: "Ya, Selesaikan",
    });
    if (!ok) return;
    await save({ status: "finished", period: "FULL TIME" });
    toast.success("Pertandingan selesai.");
  }

  const input =
    "w-full bg-dark border border-border rounded px-3 py-2 text-sm outline-none focus:border-brand";

  if (!match) return <p className="text-sm text-muted">Memuat...</p>;

  return (
    <AdminLayout>
    <div>
      <BackButton href="/admin/live" label="Live Control" />
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1 mt-2">
        <h1 className="font-display italic font-bold text-2xl">Kelola Live</h1>
        <span
          className={`flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full ${
            online ? "bg-green-500/15 text-green-400" : "bg-amber-500/15 text-amber-400"
          }`}
          title={online ? "Terhubung realtime" : "Koneksi terputus — menyambungkan ulang"}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${online ? "bg-green-400" : "bg-amber-400 animate-pulse"}`}></span>
          {online ? "LIVE" : "MENYAMBUNG..."}
        </span>
      </div>
      <p className="text-sm text-muted mb-1">
        {match.team1?.name} vs {match.team2?.name} • {match.lapangan}
      </p>
      <p className="text-[11px] text-muted mb-6">
        {saving ? "Menyimpan..." : savedAt ? `Tersimpan otomatis ✓ ${savedAt}` : "Semua perubahan tersimpan otomatis"}
      </p>

      {/* Skor */}
      <div className="bg-surface border border-border rounded-xl p-4 mb-4">
        <div className="grid grid-cols-2 gap-3 mb-3">
          <ScoreStepper
            label={match.team1?.short_name || match.team1?.name || "Tim 1"}
            value={live.team1_score}
            onChange={(v) => stepScore("team1", v)}
          />
          <ScoreStepper
            label={match.team2?.short_name || match.team2?.name || "Tim 2"}
            value={live.team2_score}
            onChange={(v) => stepScore("team2", v)}
          />
        </div>
        {isKnockout && isDraw && (
          <div className="bg-white/5 border border-dashed border-white/15 rounded-xl p-3 mb-3">
            <p className="text-xs font-bold text-muted uppercase tracking-wide mb-2">
              <i className="fa-solid fa-bullseye text-brand mr-1.5"></i>Skor imbang — Adu Penalti
            </p>
            <div className="grid grid-cols-2 gap-3">
              {(["team1", "team2"] as const).map((side) => {
                const pen = side === "team1" ? live.penalty1 ?? 0 : live.penalty2 ?? 0;
                const label = side === "team1" ? match.team1?.short_name || match.team1?.name || "Tim 1" : match.team2?.short_name || match.team2?.name || "Tim 2";
                return (
                  <div key={side} className="bg-dark border border-border rounded-xl p-3 text-center">
                    <div className="text-[11px] font-bold text-muted uppercase mb-2 truncate">{label}</div>
                    <div className="flex items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => penScore(side, -1)}
                        className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 text-lg font-bold transition"
                        aria-label="Kurangi penalti"
                      >
                        −
                      </button>
                      <span className="font-display italic font-bold text-4xl tabular-nums min-w-10">{pen}</span>
                      <button
                        type="button"
                        onClick={() => penScore(side, 1)}
                        className="w-9 h-9 rounded-lg bg-brand hover:bg-red-700 text-lg font-bold transition live-glow"
                        aria-label="Tambah penalti"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-[11px] text-muted mt-2">Skor penalti mengikuti jumlah event eksekutor gol — tambah via tombol + atau form event. Skor wajib berbeda agar pemenang maju otomatis. Gol penalti tidak masuk top skor.</p>
          </div>
        )}
        <div className="grid sm:grid-cols-2 gap-2 mb-3">
          <button
            type="button"
            onClick={() => openGoalModal("team1")}
            className="py-2.5 rounded-lg bg-white/10 hover:bg-brand text-sm font-bold transition"
          >
            ⚽ Gol {match.team1?.short_name || "Tim 1"}
          </button>
          <button
            type="button"
            onClick={() => openGoalModal("team2")}
            className="py-2.5 rounded-lg bg-white/10 hover:bg-brand text-sm font-bold transition"
          >
            ⚽ Gol {match.team2?.short_name || "Tim 2"}
          </button>
        </div>
        {/* Aksi cepat per tim */}
        {(["team1", "team2"] as const).map((side) => (
          <div key={side} className="flex flex-wrap items-center gap-1.5 mb-2">
            <span className="text-[11px] font-bold text-muted uppercase w-20 truncate">
              {side === "team1" ? match.team1?.short_name || "Tim 1" : match.team2?.short_name || "Tim 2"}
            </span>
            {(
              [
                ["yellow_card", "🟨 Kartu Kuning"],
                ["red_card", "🟥 Kartu Merah"],
                ["shootout_miss", "❌ Penalti Gagal"],
              ] as const
            ).map(([kind, label]) => (
              <button
                key={kind}
                type="button"
                onClick={() => openAction(kind, side)}
                className="text-[11px] font-bold bg-white/5 hover:bg-white/15 border border-white/10 rounded-full px-2.5 py-1 transition"
              >
                {label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => recordTeamFoul(side)}
              title={`Total babak ini: ${foulTotal(side)}`}
              className={`text-[11px] font-bold border rounded-full px-2.5 py-1 transition ${foulCount(side) >= 4 ? "bg-red-600/20 border-red-500/50 text-red-300 hover:bg-red-600/30" : "bg-white/5 hover:bg-white/15 border-white/10"}`}
            >
              ⚠️ Foul ({foulCount(side)})
            </button>
          </div>
        ))}
        <div className="bg-white/5 border border-dashed border-white/15 rounded-xl p-3 mb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-bold text-muted uppercase tracking-wide">
              <i className="fa-solid fa-bullhorn text-brand mr-1.5"></i>Walkover — Tim Hadir
            </p>
            <select
              value={woSide}
              onChange={(e) => setWoSide(e.target.value as Side)}
              className="bg-dark border border-border rounded px-2 py-1 text-xs outline-none focus:border-brand"
            >
              <option value="team1">{match.team1?.short_name || match.team1?.name || "Tim 1"}</option>
              <option value="team2">{match.team2?.short_name || match.team2?.name || "Tim 2"}</option>
            </select>
          </div>
          <p className="text-[11px] text-muted mt-1.5">
            Panggilan {woCalls.length}/3 tercatat. Tiap panggilan +1 gol (tanpa pencatat individu). Panggilan ke-3 menyelesaikan laga 3-0. Bila tim datang, berhenti menekan dan lanjutkan laga normal.
          </p>
          <div className="flex flex-wrap gap-2 mt-2.5">
            <button
              type="button"
              onClick={recordWoCall}
              disabled={woSaving || woDone || match.status === "finished"}
              className="bg-brand hover:bg-red-700 disabled:opacity-40 text-white text-xs font-bold px-4 py-2 rounded-lg transition live-glow"
            >
              {woSaving ? "Menyimpan..." : woDone ? "WO Selesai (3/3)" : `Catat Panggilan ${woCalls.length + 1}`}
            </button>
            {woCalls.length > 0 && (
              <button
                type="button"
                onClick={cancelWo}
                disabled={woSaving}
                className="bg-white/10 hover:bg-white/20 disabled:opacity-40 text-white text-xs font-bold px-4 py-2 rounded-lg transition"
              >
                Batalkan WO
              </button>
            )}
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-3 mb-3">
          <div>
            <div className="text-[11px] font-bold text-muted uppercase mb-1.5">Babak</div>
            <PeriodChips value={live.period} onChange={(v) => save({ period: v })} />
          </div>
          <div>
            <div className="text-[11px] font-bold text-muted uppercase mb-1.5">Timer (sinkron)</div>
            <MatchTimer
              matchId={match.id}
              display={match.clock_display || match.clock || "00:00"}
              running={match.clock_running}
              ended={!!match.clock_ended}
              onChanged={() => load(false).catch(() => {})}
            />
            <div className="text-[11px] font-bold text-muted uppercase mt-3 mb-1.5">Koreksi manual</div>
            <ClockField id="live-clock" value={live.clock} onChange={onClockType} />
            <p className="text-[11px] text-muted mt-1">Timer di atas = jam resmi laga (MM:SS). Koreksi manual menghentikan timer.</p>
          </div>
        </div>
        <StatusSegment value={live.status} onChange={(v) => save({ status: v })} />
        <div className="flex flex-wrap gap-2 mt-3">
          <button
            onClick={finishMatch}
            className="px-4 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-bold transition"
          >
            Selesaikan Laga
          </button>
          <button
            onClick={undoLast}
            disabled={(match.events || []).length === 0}
            className="px-4 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-bold transition disabled:opacity-40"
          >
            Undo Event
          </button>
          <a
            href={`/matches/${match.id}/report`}
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2.5 rounded-lg bg-brand hover:bg-red-700 text-sm font-bold transition live-glow"
          >
            <i className="fa-solid fa-file-pdf mr-1"></i> Berita Acara (PDF)
          </a>
        </div>
      </div>

      {/* Event */}
      <form onSubmit={addEvent} className="bg-surface border border-border rounded-xl p-4 mb-6 grid sm:grid-cols-5 gap-3">
        <div className="sm:col-span-5 text-xs font-bold text-muted uppercase">
          Catat gol / kartu {timerMinute() !== "" && <span className="text-brand">• timer: {timerMinute()}&prime;</span>}
        </div>
        <div className="flex gap-2">
          <input className={input} type="number" min={0} max={120} placeholder="Menit" value={ev.minute} onChange={(e) => setEv({ ...ev, minute: e.target.value })} required />
          <button
            type="button"
            onClick={() => setEv((e) => ({ ...e, minute: timerMinute() || e.minute }))}
            title="Isi menit dari timer berjalan"
            className="px-3 rounded bg-white/10 hover:bg-brand text-sm font-bold transition shrink-0"
          >
            ⏱
          </button>
        </div>
        <select className={input} value={ev.team_side} onChange={(e) => setEv({ ...ev, team_side: e.target.value })}>
          <option value="team1">{match.team1?.name}</option>
          <option value="team2">{match.team2?.name}</option>
        </select>
        <select className={input} value={ev.type} onChange={(e) => setEv({ ...ev, type: e.target.value })}>
          <option value="goal">Gol</option>
          <option value="own_goal">Own Goal</option>
          <option value="shootout_goal">Gol Penalti (tak masuk top skor)</option>
          <option value="shootout_miss">Penalti Gagal</option>
          <option value="yellow_card">Kartu Kuning</option>
          <option value="red_card">Kartu Merah</option>
          <option value="foul">Pelanggaran</option>
        </select>
        {(squad[ev.team_side] || []).length > 0 ? (
          <select
            id="ev-player"
            className={input}
            value={ev.player_name}
            onChange={(e) => setEv({ ...ev, player_name: e.target.value })}
            required
          >
            <option value="">-- Pilih pemain --</option>
            {(squad[ev.team_side] || []).map((p) => (
              <option key={p.id} value={p.name}>
                {p.jersey_number ? `#${p.jersey_number} ` : ""}{p.name}
              </option>
            ))}
          </select>
        ) : (
          <input
            id="ev-player"
            className={input}
            placeholder="Nama pemain (skuad kosong)"
            value={ev.player_name}
            onChange={(e) => setEv({ ...ev, player_name: e.target.value })}
            required
          />
        )}
        {(squad[ev.team_side] || []).length > 0 ? (
          <select
            className={input}
            value={ev.assist_name}
            onChange={(e) => setEv({ ...ev, assist_name: e.target.value })}
          >
            <option value="">Assist: —</option>
            {(squad[ev.team_side] || [])
              .filter((p) => p.name !== ev.player_name)
              .map((p) => (
                <option key={p.id} value={p.name}>
                  {p.jersey_number ? `#${p.jersey_number} ` : ""}{p.name}
                </option>
              ))}
          </select>
        ) : (
          <input className={input} placeholder="Assist (opsional)" value={ev.assist_name} onChange={(e) => setEv({ ...ev, assist_name: e.target.value })} />
        )}
        <div className="sm:col-span-5">
          <button className="bg-white/10 hover:bg-white/15 text-white text-sm font-bold px-5 py-2 rounded transition">
            + Tambah Event
          </button>
        </div>
      </form>

      {/* Modal gol cepat */}
      {goalModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setGoalModal(null)}></div>
          <form
            onSubmit={submitGoalModal}
            className="relative w-full max-w-sm bg-surface border border-border rounded-2xl p-5 shadow-2xl"
          >
            <h3 className="font-bold text-white">
              ⚽ Gol {goalModal.side === "team1" ? match.team1?.short_name || match.team1?.name : match.team2?.short_name || match.team2?.name}
            </h3>
            <div className="grid gap-3 mt-4">
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">WAKTU LAGA (MENIT)</label>
                <input type="number" min={0} value={gMinute} onChange={(e) => setGMinute(e.target.value)} className={input} required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">TIPE GOL</label>
                <div className="flex flex-col gap-1.5 text-sm">
                  {(
                    [
                      ["biasa", "Gol Biasa"],
                      ["penalti", "Penalti Waktu Normal"],
                      ["own", "Own Goal"],
                    ] as const
                  ).map(([v, label]) => (
                    <label key={v} className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" checked={gKind === v} onChange={() => setGKind(v)} className="accent-red-600" />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">
                  PENCETAK GOL{gKind === "own" ? " (PEMAIN LAWAN)" : ""}
                </label>
                <PlayerPick
                  players={squad[gKind === "own" ? (goalModal.side === "team1" ? "team2" : "team1") : goalModal.side] || []}
                  value={gScorer}
                  onChange={setGScorer}
                />
              </div>
              {gKind !== "own" && (
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">ASSIST (OPSIONAL)</label>
                  <select className={input} value={gAssist} onChange={(e) => setGAssist(e.target.value)}>
                    <option value="">Tanpa Assist</option>
                    {(squad[goalModal.side] || [])
                      .filter((p) => p.name !== gScorer)
                      .map((p) => (
                        <option key={p.id} value={p.name}>
                          {p.jersey_number ? `#${p.jersey_number} ` : ""}{p.name}
                        </option>
                      ))}
                  </select>
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-5">
              <button type="button" onClick={() => setGoalModal(null)} className="flex-1 bg-white/10 hover:bg-white/20 text-white text-sm font-bold py-2.5 rounded-lg transition">
                Batal
              </button>
              <button disabled={modalSaving} className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-bold py-2.5 rounded-lg transition">
                {modalSaving ? "Menyimpan..." : "Simpan & Tambah Skor"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal eksekutor penalti */}
      {penModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setPenModal(null)}></div>
          <form
            onSubmit={submitPenModal}
            className="relative w-full max-w-sm bg-surface border border-border rounded-2xl p-5 shadow-2xl"
          >
            <h3 className="font-bold text-white">
              Eksekutor — {penModal.side === "team1" ? match.team1?.short_name || match.team1?.name : match.team2?.short_name || match.team2?.name}
            </h3>
            <div className="grid gap-3 mt-4">
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">STATUS EKSEKUSI</label>
                <div className="flex gap-4 text-sm">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" checked={pStatus === "shootout_goal"} onChange={() => setPStatus("shootout_goal")} className="accent-red-600" />
                    Gol Penalti
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" checked={pStatus === "shootout_miss"} onChange={() => setPStatus("shootout_miss")} className="accent-red-600" />
                    Gagal
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">EKSEKUTOR (NAMA / NO. PUNGGUNG)</label>
                <PlayerPick players={squad[penModal.side] || []} value={pPlayer} onChange={setPPlayer} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">WAKTU (MENIT)</label>
                <input type="number" min={0} value={pMinute} onChange={(e) => setPMinute(e.target.value)} className={input} />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button type="button" onClick={() => setPenModal(null)} className="flex-1 bg-white/10 hover:bg-white/20 text-white text-sm font-bold py-2.5 rounded-lg transition">
                Batal
              </button>
              <button disabled={modalSaving} className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-bold py-2.5 rounded-lg transition">
                {modalSaving ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal aksi cepat */}
      {actModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setActModal(null)}></div>
          <form
            onSubmit={submitAction}
            className="relative w-full max-w-sm bg-surface border border-border rounded-2xl p-5 shadow-2xl"
          >
            <h3 className="font-bold text-white">
              {actModal.kind === "yellow_card" ? "🟨 Kartu Kuning" : actModal.kind === "red_card" ? "🟥 Kartu Merah" : "❌ Penalti Gagal"}
              {" — "}
              {actModal.side === "team1" ? match.team1?.short_name || match.team1?.name : match.team2?.short_name || match.team2?.name}
            </h3>
            <div className="grid gap-3 mt-4">
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">PEMAIN</label>
                <PlayerPick players={squad[actModal.side] || []} value={aPlayer} onChange={setAPlayer} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">WAKTU (MENIT)</label>
                <input type="number" min={0} value={aMinute} onChange={(e) => setAMinute(e.target.value)} className={input} />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button type="button" onClick={() => setActModal(null)} className="flex-1 bg-white/10 hover:bg-white/20 text-white text-sm font-bold py-2.5 rounded-lg transition">
                Batal
              </button>
              <button disabled={modalSaving} className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-bold py-2.5 rounded-lg transition">
                {modalSaving ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-surface border border-border rounded-xl overflow-x-auto">
        <table className="w-full text-sm min-w-[560px]">
          <thead>
            <tr className="text-left text-[11px] uppercase text-muted border-b border-border">
              <th className="p-3">Menit</th>
              <th className="p-3">Tim</th>
              <th className="p-3">Jenis</th>
              <th className="p-3">Pemain</th>
              <th className="p-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {(match.events || []).map((t: MatchEvent) => (
              <tr key={t.id}>
                <td className="p-3 tabular-nums">{t.minute}&apos;</td>
                <td className="p-3 text-muted">{t.team_side === "team1" ? match.team1?.name : match.team2?.name}</td>
                <td className="p-3">{TYPE_LABEL[t.type]}</td>
                <td className="p-3">
                  {t.player_name} {t.assist_name && <span className="text-muted text-xs">(assist: {t.assist_name})</span>}
                </td>
                <td className="p-3 text-right">
                  <button onClick={() => removeEvent(t.id)} className="text-xs text-muted hover:text-brand">Hapus</button>
                </td>
              </tr>
            ))}
            {(match.events || []).length === 0 && (
              <tr>
                <td colSpan={5} className="p-4 text-center text-muted text-xs">Belum ada event.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
    </AdminLayout>
  );
}