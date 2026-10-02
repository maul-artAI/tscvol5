
import { useEffect, useMemo, useState } from "react";
import { Link } from "@inertiajs/react";
import { apiFetch, revalidateSite, type Team, type TournamentMatch } from "../../lib/api";
import { useFeedback } from "../../Components/Feedback";
import AdminLayout from "../../Layouts/AdminLayout";

type Form = {
  category: string;
  stage: string;
  lapangan: string;
  venue: string;
  match_date: string;
  kickoff: string;
  team1_id: string;
  team2_id: string;
  status: string;
  round_label: string;
  round_order: string;
  slot: string;
  winner_next_match_id: string;
  winner_next_side: string;
};

const EMPTY: Form = {
  category: "SMA",
  stage: "",
  lapangan: "Lapangan 1",
  venue: "SMK Telkom Makassar",
  match_date: "",
  kickoff: "",
  team1_id: "",
  team2_id: "",
  status: "scheduled",
  round_label: "",
  round_order: "0",
  slot: "",
  winner_next_match_id: "",
  winner_next_side: "team1",
};

const STATUS: Record<string, string> = { scheduled: "Terjadwal", live: "Live", finished: "Selesai" };
const MONTHS_ID = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des" ];

function fmtTanggal(iso?: string | null): string {
  const s = (iso || "").slice(0, 10);
  if (!s) return "-";
  const d = new Date(`${s}T00:00:00`);
  if (isNaN(+d)) return s;
  return `${d.getDate()} ${MONTHS_ID[d.getMonth()]} ${d.getFullYear()}`;
}
const PER_PAGE = 15;

export default function AdminMatchesPage({ initialMatches, initialTeams }: { initialMatches?: TournamentMatch[]; initialTeams?: Team[] }) {
  const { toast, confirmDlg } = useFeedback();
  const [matches, setMatches] = useState<TournamentMatch[]>(initialMatches ?? []);
  const [teams, setTeams] = useState<Team[]>(initialTeams ?? []);
  const [q, setQ] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [fCat, setFCat] = useState("");
  const [fDate, setFDate] = useState("");
  const [page, setPage] = useState(1);
  const [drawer, setDrawer] = useState<null | { mode: "add" } | { mode: "edit"; match: TournamentMatch }>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [saving, setSaving] = useState(false);

  async function load() {
    const [m, t] = await Promise.all([
      apiFetch<{ data: TournamentMatch[] }>("/matches"),
      apiFetch<{ data: Team[] }>("/teams?active_only=0"),
    ]);
    setMatches(m.data);
    setTeams(t.data);
  }

  useEffect(() => {
    if (initialMatches !== undefined) return;
    load().catch(() => {});
  }, []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawer(null);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return matches.filter(
      (m) =>
        (!fStatus || m.status === fStatus) &&
        (!fCat || m.category === fCat) &&
        (!fDate || (m.match_date || "").slice(0, 10) === fDate) &&
        (!needle ||
          (m.team1?.name || "").toLowerCase().includes(needle) ||
          (m.team2?.name || "").toLowerCase().includes(needle) ||
          (m.stage || "").toLowerCase().includes(needle) ||
          (m.lapangan || "").toLowerCase().includes(needle))
    );
  }, [matches, q, fStatus, fCat, fDate]);

  const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const shown = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const liveCount = matches.filter((m) => m.status === "live").length;

  function toForm(m: TournamentMatch): Form {
    return {
      category: m.category,
      stage: m.stage || "",
      lapangan: m.lapangan || "Lapangan 1",
      venue: m.venue || "SMK Telkom Makassar",
      match_date: (m.match_date || "").slice(0, 10),
      kickoff: (m.kickoff || "").slice(0, 5),
      team1_id: m.team1_id ? String(m.team1_id) : "",
      team2_id: m.team2_id ? String(m.team2_id) : "",
      status: m.status,
      round_label: m.round_label || "",
      round_order: String(m.round_order ?? 0),
      slot: m.slot || "",
      winner_next_match_id: m.winner_next_match_id ? String(m.winner_next_match_id) : "",
      winner_next_side: m.winner_next_side || "team1",
    };
  }

  function openAdd(prefill?: Partial<Form>) {
    setForm({ ...EMPTY, ...prefill });
    setDrawer({ mode: "add" });
  }

  function openEdit(m: TournamentMatch) {
    setForm(toForm(m));
    setDrawer({ mode: "edit", match: m });
  }

  function duplicate(m: TournamentMatch) {
    const f = toForm(m);
    setForm({ ...f, status: "scheduled" });
    toast.success(`Duplikat dari laga #${m.id} — sesuaikan tanggal/jam lalu simpan.`);
    setDrawer({ mode: "add" });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        team1_id: form.team1_id ? Number(form.team1_id) : null,
        team2_id: form.team2_id ? Number(form.team2_id) : null,
        kickoff: form.kickoff || null,
        round_order: Number(form.round_order) || 0,
        winner_next_match_id: form.winner_next_match_id ? Number(form.winner_next_match_id) : null,
      };
      if (drawer?.mode === "edit") {
        await apiFetch(`/matches/${drawer.match.id}`, { method: "PUT", body: payload });
        toast.success("Jadwal berhasil diperbarui.");
      } else {
        await apiFetch("/matches", { method: "POST", body: payload });
        toast.success("Jadwal berhasil ditambahkan.");
      }
      setDrawer(null);
      revalidateSite(["/", "/jadwal", "/klasemen", "/bagan"]);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan.");
    } finally {
      setSaving(false);
    }
  }

  async function quickStatus(m: TournamentMatch, status: string) {
    const label = status === "live" ? "mulai live" : "selesaikan";
    const okStatus = await confirmDlg({
      title: `${label === "mulai live" ? "Mulai live" : "Selesaikan"} laga ini?`,
      detail: `${m.team1?.name || "?"} vs ${m.team2?.name || "?"} — ${m.stage || ""} ${m.match_date || ""} ${m.kickoff || ""}`.trim(),
      confirmLabel: label === "mulai live" ? "Ya, Live" : "Ya, Selesaikan",
    });
    if (!okStatus) return;
    try {
      if (status === "live") {
        await apiFetch(`/matches/${m.id}/clock/start`, { method: "POST" }).catch(() => {});
      }
      await apiFetch(`/matches/${m.id}/live`, {
        method: "PATCH",
        body: status === "live" ? { status, period: "1ST HALF" } : { status, period: "FULL TIME" },
      });
      revalidateSite(["/", "/jadwal", "/klasemen", "/bagan"]);
      await load();
      toast.success(status === "live" ? "Laga live." : "Laga selesai.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengubah status.");
    }
  }

  async function remove(m: TournamentMatch) {
    const ok = await confirmDlg({
      title: "Hapus Data Ini?",
      detail: `Laga ${m.team1?.name || "?"} vs ${m.team2?.name || "?"} (${m.stage || ""} ${m.match_date || ""} ${m.kickoff || ""}) beserta seluruh eventnya akan dihapus permanen.`.trim(),
    });
    if (!ok) return;
    try {
      await apiFetch(`/matches/${m.id}`, { method: "DELETE" });
      revalidateSite(["/", "/jadwal", "/klasemen", "/bagan"]);
      await load();
      toast.success("Data berhasil dihapus.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus.");
    }
  }

  const input =
    "w-full bg-dark border border-border rounded px-3 py-2 text-sm outline-none focus:border-brand";
  const teamOpts = (cat: string) =>
    teams
      .filter((t) => t.category === cat)
      .map((t) => (
        <option key={t.id} value={t.id}>
          {t.short_name || t.name} — {t.name}
        </option>
      ));

  return (
    <AdminLayout>
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <h1 className="font-display italic font-bold text-2xl">Jadwal</h1>
        <button
          onClick={() => openAdd()}
          className="bg-brand hover:bg-red-700 text-white text-sm font-bold px-4 py-2 rounded-lg transition live-glow"
        >
          + Tambah Jadwal
        </button>
      </div>
      <p className="text-sm text-muted mb-5">
        {filtered.length} dari {matches.length} laga • {liveCount} live sekarang.
      </p>

      {/* Toolbar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1); }}
          placeholder="Cari tim / stage..."
          className={`${input} col-span-2 sm:col-span-1`}
        />
        <select value={fStatus} onChange={(e) => { setFStatus(e.target.value); setPage(1); }} className={input}>
          <option value="">Semua status</option>
          <option value="live">Live</option>
          <option value="scheduled">Terjadwal</option>
          <option value="finished">Selesai</option>
        </select>
        <select value={fCat} onChange={(e) => { setFCat(e.target.value); setPage(1); }} className={input}>
          <option value="">SMA + SMP</option>
          <option value="SMA">SMA</option>
          <option value="SMP">SMP</option>
        </select>
        <input
          type="date"
          value={fDate}
          onChange={(e) => { setFDate(e.target.value); setPage(1); }}
          className={input}
        />
        <div className="col-span-2 sm:col-span-1 flex gap-1">
          <button
            onClick={() => { const t = new Date(); setFDate(`${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`); setPage(1); }}
            className="flex-1 text-xs bg-surface border border-border rounded text-muted hover:text-white transition"
          >
            Hari ini
          </button>
          {(q || fStatus || fCat || fDate) && (
            <button
              onClick={() => { setQ(""); setFStatus(""); setFCat(""); setFDate(""); setPage(1); }}
              className="flex-1 text-xs text-muted hover:text-white transition"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Tabel */}
      <div className="bg-surface border border-border rounded-xl overflow-x-auto">
        <table className="w-full text-sm min-w-[820px]">
          <thead>
            <tr className="text-left text-[11px] uppercase text-muted border-b border-border">
              <th className="p-3">Tanggal</th>
              <th className="p-3">Laga</th>
              <th className="p-3">Skor</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {shown.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-muted text-xs">Tidak ada laga yang cocok.</td>
              </tr>
            )}
            {shown.map((m) => (
              <tr key={m.id}>
                <td className="p-3 text-muted tabular-nums whitespace-nowrap">
                  {fmtTanggal(m.match_date)}
                  <span className="block text-[11px]">{(m.kickoff || "").slice(0, 5)}</span>
                </td>
                <td className="p-3 font-medium">
                  {m.team1?.short_name || m.team1?.name || "?"} <span className="text-muted">vs</span> {m.team2?.short_name || m.team2?.name || "?"}
                  <span className="block text-[11px] text-muted font-normal">
                    {m.lapangan} • {m.stage || m.category}
                    {m.round_label && <span className="text-brand"> • {m.round_label}{m.slot ? ` (${m.slot})` : ""}</span>}
                    {m.slot && <span className="ml-1 text-[9px] font-bold bg-brand/15 text-brand px-1.5 py-0.5 rounded">BRACKET</span>}
                  </span>
                </td>
                <td className="p-3 font-display italic font-bold tabular-nums whitespace-nowrap">
                  {m.team1_score} - {m.team2_score}
                </td>
                <td className="p-3">
                  {m.status === "live" ? (
                    <span className="text-[10px] font-bold bg-brand px-2 py-0.5 rounded live-glow">LIVE</span>
                  ) : (
                    <span className="text-xs text-muted">{STATUS[m.status]}</span>
                  )}
                </td>
                <td className="p-3 text-right whitespace-nowrap">
                  {m.status === "scheduled" && (
                    <button onClick={() => quickStatus(m, "live")} title="Mulai live" className="text-green-400 hover:text-green-300 text-sm mr-2">
                      <i className="fa-solid fa-play"></i>
                    </button>
                  )}
                  {m.status === "live" && (
                    <button onClick={() => quickStatus(m, "finished")} title="Selesaikan" className="text-green-400 hover:text-green-300 text-sm mr-2">
                      <i className="fa-solid fa-flag-checkered"></i>
                    </button>
                  )}
                  <Link href={`/admin/matches/${m.id}`} title="Kelola live" className="text-muted hover:text-white text-sm mr-2">
                    <i className="fa-solid fa-tower-broadcast"></i>
                  </Link>
                  <button onClick={() => duplicate(m)} title="Duplikat" className="text-muted hover:text-white text-sm mr-2">
                    <i className="fa-solid fa-copy"></i>
                  </button>
                  <button onClick={() => { setForm({
                    category: m.category, stage: m.stage || "", lapangan: m.lapangan || "Lapangan 1",
                    venue: m.venue || "", match_date: (m.match_date || "").slice(0, 10),
                    kickoff: (m.kickoff || "").slice(0, 5),
                    team1_id: m.team1_id ? String(m.team1_id) : "", team2_id: m.team2_id ? String(m.team2_id) : "",
                    status: m.status, round_label: m.round_label || "", round_order: String(m.round_order ?? 0),
                    slot: m.slot || "", winner_next_match_id: m.winner_next_match_id ? String(m.winner_next_match_id) : "",
                    winner_next_side: m.winner_next_side || "team1",
                  }); setDrawer({ mode: "edit", match: m }); }} title="Ubah" className="text-muted hover:text-white text-sm mr-2">
                    <i className="fa-solid fa-pen"></i>
                  </button>
                  <button onClick={() => remove(m)} title={m.slot ? "Slot bracket — hapus via halaman Bracket" : "Hapus"} disabled={!!m.slot} className="text-muted hover:text-brand disabled:opacity-30 disabled:cursor-not-allowed text-sm">
                    <i className="fa-solid fa-trash"></i>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4 text-sm">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1.5 rounded bg-surface border border-border text-muted disabled:opacity-40">‹</button>
          <span className="text-xs text-muted tabular-nums">{page} / {pages}</span>
          <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 rounded bg-surface border border-border text-muted disabled:opacity-40">›</button>
        </div>
      )}

      {/* Drawer tambah/ubah/duplikat */}
      {drawer && (
        <div className="fixed inset-0 z-[100]">
          <div className="absolute inset-0 bg-black/60" onClick={() => setDrawer(null)} />
          <aside className="absolute right-0 top-0 h-full w-full max-w-md bg-surface border-l border-border p-5 overflow-y-auto">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-display italic font-bold text-xl">
                {drawer.mode === "add" ? "Tambah Jadwal" : `Ubah Jadwal #${drawer.match.id}`}
              </h2>
              <button onClick={() => setDrawer(null)} className="text-muted hover:text-white text-lg px-2" aria-label="Tutup">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <p className="text-xs text-muted mb-4">Esc untuk tutup tanpa menyimpan.</p>

            <form onSubmit={submit} className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">KATEGORI *</label>
                  <select className={input} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                    <option value="SMA">SMA</option>
                    <option value="SMP">SMP</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">STATUS</label>
                  <select className={input} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    <option value="scheduled">Terjadwal</option>
                    <option value="live">Live</option>
                    <option value="finished">Selesai</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">TIM 1 *</label>
                  <select className={input} value={form.team1_id} onChange={(e) => setForm({ ...form, team1_id: e.target.value })} required>
                    <option value="">-- Tim 1 --</option>
                    {teamOpts(form.category)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">TIM 2 *</label>
                  <select className={input} value={form.team2_id} onChange={(e) => setForm({ ...form, team2_id: e.target.value })} required>
                    <option value="">-- Tim 2 --</option>
                    {teamOpts(form.category)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">TANGGAL *</label>
                  <input className={input} type="date" value={form.match_date} onChange={(e) => setForm({ ...form, match_date: e.target.value })} required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">KICKOFF</label>
                  <input className={input} type="time" value={form.kickoff} onChange={(e) => setForm({ ...form, kickoff: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">LAPANGAN</label>
                  <select className={input} value={form.lapangan} onChange={(e) => setForm({ ...form, lapangan: e.target.value })}>
                    <option value="Lapangan 1">Lapangan 1</option>
                    <option value="Lapangan 2">Lapangan 2</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">STAGE</label>
                  <input className={input} placeholder="Fase Grup • Grup A" value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">VENUE</label>
                <input className={input} value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} />
              </div>

              <div className="text-xs font-bold text-muted uppercase pt-1">Bracket (opsional)</div>
              <div className="grid grid-cols-3 gap-3">
                <input className={input} placeholder="Ronde" value={form.round_label} onChange={(e) => setForm({ ...form, round_label: e.target.value })} />
                <input className={input} type="number" min={0} max={99} placeholder="Urutan" value={form.round_order} onChange={(e) => setForm({ ...form, round_order: e.target.value })} />
                <input className={input} placeholder="Slot" value={form.slot} onChange={(e) => setForm({ ...form, slot: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <select className={input} value={form.winner_next_match_id} onChange={(e) => setForm({ ...form, winner_next_match_id: e.target.value })}>
                  <option value="">-- Pemenang lanjut ke --</option>
                  {matches
                    .filter((x) => x.category === form.category && (!("match" in drawer && drawer.match) || x.id !== (drawer as { match: TournamentMatch }).match.id))
                    .map((x) => (
                      <option key={x.id} value={x.id}>
                        #{x.id} {x.slot ? `[${x.slot}] ` : ""}{x.team1?.short_name} vs {x.team2?.short_name}
                      </option>
                    ))}
                </select>
                <select className={input} value={form.winner_next_side} onChange={(e) => setForm({ ...form, winner_next_side: e.target.value })}>
                  <option value="team1">Isi slot Tim 1</option>
                  <option value="team2">Isi slot Tim 2</option>
                </select>
              </div>

              <button disabled={saving} className="bg-brand hover:bg-red-700 disabled:opacity-60 text-white text-sm font-bold py-2.5 rounded-lg transition live-glow mt-1">
                {saving ? "Menyimpan..." : drawer.mode === "add" ? "Tambah Jadwal" : "Simpan Perubahan"}
              </button>
            </form>
          </aside>
        </div>
      )}
    </div>
    </AdminLayout>
  );
}