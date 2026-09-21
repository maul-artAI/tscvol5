import { useEffect, useRef, useState } from "react";
import { apiFetch, revalidateSite, type MatchEvent, type TournamentMatch } from "../../lib/api";
import BackButton from "../../Components/BackButton";
import AdminLayout from "../../Layouts/AdminLayout";
import {
  ClockField,
  MatchTimer,
  PeriodChips,
  ScoreStepper,
  StatusSegment,
} from "../../Components/live-controls";

const TYPE_LABEL: Record<string, string> = { goal: "Gol", yellow_card: "Kartu Kuning", red_card: "Kartu Merah", foul: "Pelanggaran" };

export default function AdminMatchDetailPage({ id }: { id: number }) {
  const [match, setMatch] = useState<TournamentMatch | null>(null);
  const [live, setLive] = useState({ team1_score: 0, team2_score: 0, status: "scheduled", period: "", clock: "" });
  const [auto, setAuto] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState("");
  const [ev, setEv] = useState({ minute: "", team_side: "team1", type: "goal", player_name: "", assist_name: "" });
  const [msg, setMsg] = useState("");
  const clockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const busy = useRef(false);

  // Skuad kedua tim untuk dropdown pemain (sinkron data pemain).
  type SquadPlayer = { id: number; name: string; jersey_number?: number | null };
  const [squad, setSquad] = useState<Record<string, SquadPlayer[]>>({ team1: [], team2: [] });

  useEffect(() => {
    if (!match?.team1_id && !match?.team2_id) return;
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
      });
    }
  }

  useEffect(() => {
    load(true).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Auto-refresh: lewati form jam yang sedang diketik (debounce berjalan).
  useEffect(() => {
    if (!auto) return;
    const t = setInterval(() => {
      if (!busy.current && document.activeElement?.id !== "live-clock") {
        load(true).catch(() => {});
      } else {
        load(false).catch(() => {});
      }
    }, 15000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, id]);

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
      setMsg(err instanceof Error ? err.message : "Gagal menyimpan.");
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

  /** Gol cepat: skor +1 tersimpan otomatis, form event langsung terisi. */
  function quickGoal(side: "team1" | "team2") {
    const patch = side === "team1" ? { team1_score: live.team1_score + 1 } : { team2_score: live.team2_score + 1 };
    save(patch);
    const mm = timerMinute();
    setEv((e) => ({ ...e, team_side: side, type: "goal", minute: mm || e.minute }));
    document.getElementById("ev-player")?.focus();
    setMsg("Gol +1 tersimpan. Lengkapi nama pencetak gol lalu tekan Tambah.");
  }

  async function addEvent(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    try {
      await apiFetch(`/matches/${id}/events`, {
        method: "POST",
        body: { ...ev, minute: Number(ev.minute) },
      });
      setEv({ minute: "", team_side: "team1", type: "goal", player_name: "", assist_name: "" });
      revalidateSite(["/"]);
      await load(false);
      setMsg("Event dicatat.");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Gagal mencatat event.");
    }
  }

  async function undoLast() {
    const events = [...(match?.events || [])].sort((a, b) => b.id - a.id);
    const last = events[0];
    if (!last) return;
    if (!confirm(`Batalkan event terakhir (${last.minute}' ${last.player_name})?`)) return;
    await apiFetch(`/events/${last.id}`, { method: "DELETE" });
    revalidateSite(["/"]);
    await load(false);
    setMsg("Event terakhir dibatalkan.");
  }

  async function removeEvent(evId: number) {
    if (!confirm("Hapus event ini?")) return;
    await apiFetch(`/events/${evId}`, { method: "DELETE" });
    revalidateSite(["/"]);
    await load(false);
  }

  async function finishMatch() {
    if (!confirm("Selesaikan pertandingan ini?")) return;
    await save({ status: "finished", period: "FULL TIME" });
    setMsg("Pertandingan selesai.");
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
        <label className="flex items-center gap-2 text-xs text-muted">
          <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} />
          Auto-refresh 15 dtk
        </label>
      </div>
      <p className="text-sm text-muted mb-1">
        {match.team1?.name} vs {match.team2?.name} • {match.lapangan}
      </p>
      <p className="text-[11px] text-muted mb-6">
        {saving ? "Menyimpan..." : savedAt ? `Tersimpan otomatis ✓ ${savedAt}` : "Semua perubahan tersimpan otomatis"}
      </p>

      {msg && <p className="mb-4 text-xs bg-white/5 border border-border rounded px-3 py-2">{msg}</p>}

      {/* Skor */}
      <div className="bg-surface border border-border rounded-xl p-4 mb-4">
        <div className="grid grid-cols-2 gap-3 mb-3">
          <ScoreStepper
            label={match.team1?.short_name || match.team1?.name || "Tim 1"}
            value={live.team1_score}
            onChange={(v) => save({ team1_score: v })}
          />
          <ScoreStepper
            label={match.team2?.short_name || match.team2?.name || "Tim 2"}
            value={live.team2_score}
            onChange={(v) => save({ team2_score: v })}
          />
        </div>
        <div className="grid sm:grid-cols-2 gap-2 mb-3">
          <button
            type="button"
            onClick={() => quickGoal("team1")}
            className="py-2.5 rounded-lg bg-white/10 hover:bg-brand text-sm font-bold transition"
          >
            ⚽ Gol {match.team1?.short_name || "Tim 1"}
          </button>
          <button
            type="button"
            onClick={() => quickGoal("team2")}
            className="py-2.5 rounded-lg bg-white/10 hover:bg-brand text-sm font-bold transition"
          >
            ⚽ Gol {match.team2?.short_name || "Tim 2"}
          </button>
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