
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@inertiajs/react";
import { apiFetch, revalidateSite, type TournamentMatch } from "../../lib/api";
import { getEcho, mergeMatch, type LiveMatch } from "../../lib/echo";
import { MatchTimer, PeriodChips, ScoreStepper, StatusSegment } from "../../Components/live-controls";
import AdminLayout from "../../Layouts/AdminLayout";
import { useFeedback } from "../../Components/Feedback";

export default function LiveControlPage({ initialLive, initialScheduled }: { initialLive?: TournamentMatch[]; initialScheduled?: TournamentMatch[] }) {
  const [live, setLive] = useState<TournamentMatch[]>(initialLive ?? []);
  const [scheduled, setScheduled] = useState<TournamentMatch[]>(initialScheduled ?? []);
  const [auto, setAuto] = useState(true);
  const [saving, setSaving] = useState<Record<number, boolean>>({});
  const [savedAt, setSavedAt] = useState<Record<number, string>>({});
  const { toast } = useFeedback();
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const inFlight = useRef(0);

  const load = useCallback(async () => {
    const [l, s] = await Promise.all([
      apiFetch<{ data: TournamentMatch[] }>("/matches/live"),
      apiFetch<{ data: TournamentMatch[] }>("/matches?status=scheduled"),
    ]);
    setLive(l.data);
    setScheduled(s.data.slice(0, 6));
    setLastRefresh(new Date());
  }, []);

  useEffect(() => {
    if (initialLive !== undefined) {
      setLastRefresh(new Date());
      return;
    }
    load().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Realtime via socket; polling 15 dtk tetap sebagai cadangan.
  useEffect(() => {
    const echo = getEcho();
    echo?.channel("scores").listen(".match.updated", (e: { match: LiveMatch }) => {
      if (!e?.match?.id) return;
      const m = e.match as TournamentMatch;
      setLive((prev) => mergeMatch(prev, m));
      setScheduled((prev) => mergeMatch(prev, m));
      setLastRefresh(new Date());
    });
    return () => {
      echo?.leaveChannel("scores");
    };
  }, []);

  // Auto-refresh, tapi jangan menimpa saat ada request simpan berjalan.
  useEffect(() => {
    if (!auto) return;
    const t = setInterval(() => {
      if (inFlight.current === 0) load().catch(() => {});
    }, 15000);
    return () => clearInterval(t);
  }, [auto, load]);

  /** Ubah + simpan otomatis (optimistic). */
  async function patch(id: number, p: Record<string, unknown>) {
    setLive((prev) => prev.map((m) => (m.id === id ? { ...m, ...p } : m)));
    inFlight.current++;
    setSaving((s) => ({ ...s, [id]: true }));
    try {
      await apiFetch(`/matches/${id}/live`, { method: "PATCH", body: p });
      revalidateSite(["/", "/jadwal"]);
      setSavedAt((s) => ({ ...s, [id]: new Date().toLocaleTimeString("id-ID") }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan.");
      await load().catch(() => {});
    } finally {
      inFlight.current--;
      setSaving((s) => ({ ...s, [id]: false }));
    }
  }

  async function startLive(id: number) {
    try {
      await apiFetch(`/matches/${id}/clock/start`, { method: "POST" }).catch(() => {});
      await apiFetch(`/matches/${id}/live`, {
        method: "PATCH",
        body: { status: "live", period: "1ST HALF" },
      });
      await load().catch(() => {});
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memulai live.");
    }
  }

  const occupied: Record<string, string> = {};
  live.forEach((m) => {
    if (m.lapangan) occupied[m.lapangan] = `${m.team1?.short_name || m.team1?.name} vs ${m.team2?.short_name || m.team2?.name}`;
  });

  return (
    <AdminLayout>
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <h1 className="font-display italic font-bold text-2xl">Live Control</h1>
        <label className="flex items-center gap-2 text-xs text-muted">
          <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} />
          Auto-refresh 15 dtk
          {lastRefresh && <span>• {lastRefresh.toLocaleTimeString("id-ID")}</span>}
        </label>
      </div>
      <p className="text-sm text-muted mb-6">
        Satu layar untuk 2 lapangan — tiap admin pegang 1 kartu. Semua perubahan tersimpan otomatis.
      </p>

      {live.length === 0 && (
        <p className="text-sm text-muted bg-surface border border-border rounded-xl p-4 mb-6">
          Tidak ada laga live. Mulai dari daftar terjadwal di bawah.
        </p>
      )}

      <div className="grid xl:grid-cols-2 gap-4 mb-8">
        {live.map((m) => (
          <div key={m.id} className="bg-surface border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[11px] font-bold text-muted uppercase">
                {m.lapangan} • {m.stage}
              </div>
              <span className="text-[10px] font-bold bg-brand px-2 py-0.5 rounded live-glow">LIVE</span>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <ScoreStepper
                label={m.team1?.short_name || m.team1?.name || "Tim 1"}
                value={m.team1_score}
                onChange={(v) => patch(m.id, { team1_score: v })}
              />
              <ScoreStepper
                label={m.team2?.short_name || m.team2?.name || "Tim 2"}
                value={m.team2_score}
                onChange={(v) => patch(m.id, { team2_score: v })}
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-3 mb-3">
              <div>
                <div className="text-[11px] font-bold text-muted uppercase mb-1.5">Babak</div>
                <PeriodChips value={m.period || ""} onChange={(v) => patch(m.id, { period: v })} />
              </div>
              <div>
                <div className="text-[11px] font-bold text-muted uppercase mb-1.5">Timer (sinkron)</div>
                <MatchTimer
                  matchId={m.id}
                  display={m.clock_display || m.clock || "00:00"}
                  running={m.clock_running}
                  ended={!!m.clock_ended}
                  onChanged={() => load().catch(() => {})}
                />
              </div>
            </div>

            <StatusSegment value={m.status} onChange={(v) => patch(m.id, { status: v })} />

            <div className="flex items-center gap-2 mt-3">
              <span className="flex-1 text-[11px] text-muted">
                {saving[m.id] ? "Menyimpan..." : savedAt[m.id] ? `Tersimpan ✓ ${savedAt[m.id]}` : "Tersimpan otomatis"}
              </span>
              <Link
                href={`/admin/matches/${m.id}`}
                className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-bold transition"
              >
                Event <i className="fa-solid fa-arrow-right text-xs"></i>
              </Link>
            </div>
          </div>
        ))}
      </div>

      <h2 className="font-bold text-sm uppercase tracking-wide mb-3">Terjadwal berikutnya</h2>
      <div className="bg-surface border border-border rounded-xl overflow-x-auto">
        <table className="w-full text-sm min-w-[560px]">
          <tbody className="divide-y divide-border/50">
            {scheduled.map((m) => {
              const usedBy = m.lapangan ? occupied[m.lapangan] : undefined;
              return (
                <tr key={m.id}>
                  <td className="p-3 text-muted tabular-nums whitespace-nowrap">
                    {m.match_date?.slice(0, 10)} {(m.kickoff || "").slice(0, 5)}
                  </td>
                  <td className="p-3 font-medium">
                    {m.team1?.name} <span className="text-muted">vs</span> {m.team2?.name}
                    <span className="block text-[11px] text-muted font-normal">{m.lapangan} • {m.stage}</span>
                    {usedBy && (
                      <span className="block text-[11px] font-bold text-yellow-400">
                        {m.lapangan} dipakai: {usedBy}
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => startLive(m.id)}
                      disabled={!!usedBy}
                      title={usedBy ? `${m.lapangan} sedang dipakai` : "Mulai live"}
                      className="text-xs font-bold bg-brand hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded transition"
                    >
                      {usedBy ? "Dipakai" : "Mulai Live"}
                    </button>
                  </td>
                </tr>
              );
            })}
            {scheduled.length === 0 && (
              <tr>
                <td className="p-4 text-center text-muted text-xs">Tidak ada jadwal tersisa.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
    </AdminLayout>
  );
}