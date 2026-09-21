
import { useEffect, useMemo, useState } from "react";
import { apiFetch, revalidateSite, type Team } from "../../lib/api";
import AdminLayout from "../../Layouts/AdminLayout";

type Player = {
  id: number;
  team_id: number;
  name: string;
  jersey_number?: number | null;
  position?: string | null;
  photo_url?: string | null;
  photo_path?: string | null;
  is_active: boolean;
};

type TeamWithCount = Team & { players_count?: number };

const GROUPS = ["A", "B", "C", "D", "E", "F", "G", "H"];
const POSITIONS = ["Kiper", "Anchor", "Ala", "Pivot"];

/** "10 - Ahmad R. - Pivot" / "10 Ahmad R Pivot" / "Ahmad R." */
function parseBulkLine(line: string): { name: string; jersey_number: string; position: string } | null {
  const clean = line.replace(/^[-*•\s]+/, "").trim();
  if (!clean) return null;
  let rest = clean;
  let num = "";
  const numMatch = rest.match(/^(\d{1,2})\s*[-–.]?\s+(.+)$/);
  if (numMatch) {
    num = numMatch[1];
    rest = numMatch[2].trim();
  }
  let pos = "";
  for (const p of POSITIONS) {
    const re = new RegExp(`[\\s\\-–.,]+${p}$`, "i");
    if (re.test(rest)) {
      pos = p;
      rest = rest.replace(re, "").trim();
    }
  }
  if (!rest) return null;
  return { name: rest, jersey_number: num, position: pos };
}

export default function AdminPlayersPage() {
  const [teams, setTeams] = useState<TeamWithCount[]>([]);
  const [cat, setCat] = useState<"SMA" | "SMP">("SMA");
  const [grp, setGrp] = useState("A");
  const [teamId, setTeamId] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [q, setQ] = useState("");
  const [drawer, setDrawer] = useState<null | { mode: "add" } | { mode: "edit"; player: Player } | { mode: "bulk" }>(null);
  const [form, setForm] = useState({ name: "", jersey_number: "", position: "", is_active: true });
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [bulk, setBulk] = useState("");
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadTeams() {
    const res = await apiFetch<{ data: TeamWithCount[] }>("/teams?active_only=0");
    setTeams(res.data);
  }

  async function loadPlayers(id: string) {
    if (!id) return;
    const res = await apiFetch<{ data: Player[] }>(`/teams/${id}/players?active_only=0`);
    setPlayers(res.data);
  }

  useEffect(() => {
    loadTeams().catch(() => {});
  }, []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawer(null);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  useEffect(() => {
    if (!photo) return;
    const url = URL.createObjectURL(photo);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  // Tim terfilter + otomatis pilih pertama saat tab/grup berubah.
  const teamList = useMemo(
    () => teams.filter((t) => t.category === cat && (t.group_name || "").endsWith(grp)),
    [teams, cat, grp]
  );

  useEffect(() => {
    setTeamId(teamList.length > 0 ? String(teamList[0].id) : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cat, grp, teams.length]);

  useEffect(() => {
    loadPlayers(teamId).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return players.filter((p) => !needle || p.name.toLowerCase().includes(needle));
  }, [players, q]);

  const bulkParsed = useMemo(() => {
    const seen = new Set<string>();
    return bulk
      .split("\n")
      .map(parseBulkLine)
      .filter((x): x is NonNullable<typeof x> => !!x)
      .filter((x) => {
        const k = x.name.toLowerCase();
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
  }, [bulk]);

  function openAdd() {
    setForm({ name: "", jersey_number: "", position: "", is_active: true });
    setPhoto(null);
    setPhotoPreview(null);
    setRemovePhoto(false);
    setMsg("");
    setDrawer({ mode: "add" });
  }

  function openEdit(p: Player) {
    setForm({
      name: p.name,
      jersey_number: p.jersey_number ? String(p.jersey_number) : "",
      position: p.position || "",
      is_active: p.is_active,
    });
    setPhoto(null);
    setPhotoPreview(p.photo_url || null);
    setRemovePhoto(false);
    setMsg("");
    setDrawer({ mode: "edit", player: p });
  }

  function openBulk() {
    setBulk("");
    setMsg("");
    setDrawer({ mode: "bulk" });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    try {
      const fd = new FormData();
      fd.append("name", form.name.trim());
      if (form.jersey_number) fd.append("jersey_number", form.jersey_number);
      fd.append("position", form.position);
      fd.append("is_active", form.is_active ? "1" : "0");
      if (photo) fd.append("photo", photo);
      else if (drawer?.mode === "edit" && removePhoto) fd.append("remove_photo", "1");

      if (drawer?.mode === "edit") {
        await apiFetch(`/players/${drawer.player.id}`, { method: "POST", body: fd });
        setMsg("Pemain diperbarui.");
      } else {
        await apiFetch(`/teams/${teamId}/players`, { method: "POST", body: fd });
        setMsg("Pemain ditambahkan.");
      }
      setDrawer(null);
      revalidateSite(["/tim", `/tim/${teamId}`]);
      await Promise.all([loadPlayers(teamId), loadTeams()]);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Gagal menyimpan.");
    } finally {
      setSaving(false);
    }
  }

  async function submitBulk() {
    if (bulkParsed.length === 0) return;
    setSaving(true);
    setMsg("");
    let ok = 0;
    const fail: string[] = [];
    for (const b of bulkParsed) {
      try {
        const fd = new FormData();
        fd.append("name", b.name);
        if (b.jersey_number) fd.append("jersey_number", b.jersey_number);
        fd.append("position", b.position);
        fd.append("is_active", "1");
        await apiFetch(`/teams/${teamId}/players`, { method: "POST", body: fd });
        ok++;
      } catch {
        fail.push(b.name);
      }
    }
    setSaving(false);
    setMsg(
      `${ok} pemain ditambahkan.` + (fail.length > 0 ? ` Gagal: ${fail.join(", ")}.` : "")
    );
    if (fail.length === 0) setDrawer(null);
    revalidateSite(["/tim", `/tim/${teamId}`]);
    await Promise.all([loadPlayers(teamId), loadTeams()]);
  }

  async function remove(p: Player) {
    if (!confirm(`Hapus ${p.name}?`)) return;
    await apiFetch(`/players/${p.id}`, { method: "DELETE" });
    revalidateSite(["/tim", `/tim/${teamId}`]);
    await Promise.all([loadPlayers(teamId), loadTeams()]);
  }

  const input =
    "w-full bg-dark border border-border rounded px-3 py-2 text-sm outline-none focus:border-brand";
  const team = teams.find((t) => String(t.id) === teamId);

  return (
    <AdminLayout>
    <div className="flex gap-4">
      {/* Navigasi tim */}
      <aside className="w-60 shrink-0 hidden md:block">
        <div className="flex gap-1.5 mb-3">
          {(["SMA", "SMP"] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`flex-1 py-1.5 rounded text-xs font-bold transition ${
                cat === c ? "bg-brand text-white" : "bg-surface border border-border text-muted hover:text-white"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-4 gap-1.5 mb-3">
          {GROUPS.map((g) => (
            <button
              key={g}
              onClick={() => setGrp(g)}
              className={`py-1.5 rounded text-xs font-bold transition ${
                grp === g ? "bg-brand text-white" : "bg-surface border border-border text-muted hover:text-white"
              }`}
            >
              {g}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-1">
          {teamList.map((t) => (
            <button
              key={t.id}
              onClick={() => setTeamId(String(t.id))}
              className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-[13px] transition ${
                String(t.id) === teamId ? "bg-brand/15 border border-brand/50 text-white" : "bg-surface border border-border text-muted hover:text-white"
              }`}
            >
              <span className="flex-1 truncate font-medium">{t.short_name || t.name}</span>
              <span className={`text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded ${t.players_count ? "bg-white/10" : "bg-brand/20 text-brand"}`}>
                {t.players_count ?? 0}
              </span>
            </button>
          ))}
          {teamList.length === 0 && <p className="text-xs text-muted">Tidak ada tim.</p>}
        </div>
      </aside>

      {/* Daftar skuad */}
      <div className="flex-1 min-w-0">
        {/* Pemilih tim (mobile) */}
        <div className="md:hidden grid grid-cols-3 gap-2 mb-3">
          <select value={cat} onChange={(e) => setCat(e.target.value as "SMA" | "SMP")} className={input}>
            <option value="SMA">SMA</option>
            <option value="SMP">SMP</option>
          </select>
          <select value={grp} onChange={(e) => setGrp(e.target.value)} className={input}>
            {GROUPS.map((g) => (
              <option key={g} value={g}>Grup {g}</option>
            ))}
          </select>
          <select value={teamId} onChange={(e) => setTeamId(e.target.value)} className={input}>
            {teamList.map((t) => (
              <option key={t.id} value={t.id}>{t.short_name || t.name}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
          <h1 className="font-display italic font-bold text-xl truncate">
            {team ? `${team.short_name || team.name}` : "Pemain"}
            <span className="text-sm not-italic font-sans font-normal text-muted ml-2">
              {team?.name} • {shown.length} pemain
            </span>
          </h1>
          <div className="flex gap-2">
            <button
              onClick={openBulk}
              disabled={!teamId}
              className="bg-white/10 hover:bg-white/20 disabled:opacity-40 text-white text-sm font-bold px-4 py-2 rounded-lg transition"
            >
              + Banyak Sekaligus
            </button>
            <button
              onClick={openAdd}
              disabled={!teamId}
              className="bg-brand hover:bg-red-700 disabled:opacity-40 text-white text-sm font-bold px-4 py-2 rounded-lg transition live-glow"
            >
              + Satu Pemain
            </button>
          </div>
        </div>
        <p className="text-xs text-muted mb-4">Angka merah = tim belum punya skuad. Samakan ejaan nama dengan event gol.</p>

        {msg && !drawer && <p className="mb-3 text-xs bg-white/5 border border-border rounded px-3 py-2">{msg}</p>}

        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari pemain..." className={`${input} mb-3`} />

        <div className="grid sm:grid-cols-2 gap-2.5">
          {shown.map((p) => (
            <div
              key={p.id}
              onClick={() => openEdit(p)}
              className="bg-surface border border-border rounded-xl p-2.5 flex items-center gap-3 cursor-pointer transition hover:border-brand/60"
            >
              {p.photo_url ? (
                <img src={p.photo_url} alt="" className="w-11 h-11 rounded-full object-cover bg-white/10 shrink-0" />
              ) : (
                <span className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center text-muted shrink-0 font-display italic font-bold tabular-nums">
                  {p.jersey_number || <i className="fa-solid fa-user text-xs"></i>}
                </span>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm truncate">
                  {p.jersey_number && <span className="text-muted tabular-nums mr-1.5">{p.jersey_number}</span>}
                  {p.name}
                </div>
                <div className="text-[11px] text-muted">{p.position || "—"}{!p.is_active && " • NONAKTIF"}</div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); remove(p); }}
                className="text-xs text-muted hover:text-brand px-2 shrink-0"
                title="Hapus"
              >
                <i className="fa-solid fa-trash"></i>
              </button>
            </div>
          ))}
        </div>
        {shown.length === 0 && (
          <p className="text-sm text-muted bg-surface border border-border rounded-xl p-6 text-center mt-2">
            Belum ada pemain di tim ini.{" "}
            <button onClick={openBulk} className="text-brand font-bold">Tambah banyak sekaligus</button>
          </p>
        )}
      </div>

      {/* Drawer tambah/ubah */}
      {(drawer?.mode === "add" || drawer?.mode === "edit") && (
        <div className="fixed inset-0 z-[100]">
          <div className="absolute inset-0 bg-black/60" onClick={() => setDrawer(null)} />
          <aside className="absolute right-0 top-0 h-full w-full max-w-md bg-surface border-l border-border p-5 overflow-y-auto">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-display italic font-bold text-xl">
                {drawer.mode === "add" ? "Tambah Pemain" : "Ubah Pemain"}
              </h2>
              <button onClick={() => setDrawer(null)} className="text-muted hover:text-white text-lg px-2" aria-label="Tutup">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <p className="text-xs text-muted mb-4">Esc untuk tutup tanpa menyimpan.</p>

            {msg && <p className="mb-3 text-xs bg-white/5 border border-border rounded px-3 py-2">{msg}</p>}

            <form onSubmit={submit} className="grid gap-3">
              <div className="flex items-center gap-3">
                {photoPreview && !removePhoto ? (
                  <img src={photoPreview} alt="" className="w-16 h-16 rounded-full object-cover bg-white/10" />
                ) : (
                  <span className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-muted text-xl">
                    <i className="fa-solid fa-user"></i>
                  </span>
                )}
                <div className="flex-1">
                  <label className="block text-xs text-muted mb-1">Foto (max 2MB)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => { setPhoto(e.target.files?.[0] || null); setRemovePhoto(false); }}
                    className="text-xs text-muted w-full"
                  />
                  {drawer.mode === "edit" && drawer.player.photo_path && !photo && (
                    <label className="flex items-center gap-2 text-xs text-muted mt-1.5">
                      <input type="checkbox" checked={removePhoto} onChange={(e) => setRemovePhoto(e.target.checked)} />
                      Hapus foto saat ini
                    </label>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted mb-1">NAMA *</label>
                <input autoFocus className={input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required maxLength={100} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">NOMOR</label>
                  <input className={input} type="number" min={1} max={99} value={form.jersey_number} onChange={(e) => setForm({ ...form, jersey_number: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">POSISI</label>
                  <select className={input} value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })}>
                    <option value="">—</option>
                    {POSITIONS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Aktif
              </label>

              <button disabled={saving} className="bg-brand hover:bg-red-700 disabled:opacity-60 text-white text-sm font-bold py-2.5 rounded-lg transition live-glow mt-1">
                {saving ? "Menyimpan..." : drawer.mode === "add" ? "Tambah Pemain" : "Simpan Perubahan"}
              </button>
            </form>
          </aside>
        </div>
      )}

      {/* Drawer tambah banyak */}
      {drawer?.mode === "bulk" && (
        <div className="fixed inset-0 z-[100]">
          <div className="absolute inset-0 bg-black/60" onClick={() => setDrawer(null)} />
          <aside className="absolute right-0 top-0 h-full w-full max-w-md bg-surface border-l border-border p-5 overflow-y-auto">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-display italic font-bold text-xl">Tambah Banyak</h2>
              <button onClick={() => setDrawer(null)} className="text-muted hover:text-white text-lg px-2" aria-label="Tutup">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <p className="text-xs text-muted mb-3">
              Satu baris satu pemain. Format bebas: <code className="text-white">10 - Ahmad R. - Pivot</code> atau{" "}
              <code className="text-white">Ahmad R.</code> saja.
            </p>

            {msg && <p className="mb-3 text-xs bg-white/5 border border-border rounded px-3 py-2">{msg}</p>}

            <textarea
              autoFocus
              rows={10}
              value={bulk}
              onChange={(e) => setBulk(e.target.value)}
              placeholder={"10 - Ahmad R. - Pivot\n7 - Rizky A. - Ala\n1 - Fadli S. - Kiper"}
              className={`${input} font-mono`}
            />
            <p className="text-xs text-muted mt-1 mb-3 tabular-nums">
              Terdeteksi: <span className="text-white font-bold">{bulkParsed.length}</span> pemain
              {bulkParsed.length > 0 && ` — ${bulkParsed.slice(0, 3).map((b) => b.name).join(", ")}${bulkParsed.length > 3 ? "..." : ""}`}
            </p>

            <button
              onClick={submitBulk}
              disabled={saving || bulkParsed.length === 0}
              className="w-full bg-brand hover:bg-red-700 disabled:opacity-60 text-white text-sm font-bold py-2.5 rounded-lg transition live-glow"
            >
              {saving ? "Menyimpan..." : `Simpan ${bulkParsed.length} Pemain`}
            </button>
          </aside>
        </div>
      )}
    </div>
    </AdminLayout>
  );
}