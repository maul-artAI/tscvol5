
import { useEffect, useMemo, useState } from "react";
import { apiFetch, revalidateSite, type Team } from "../../lib/api";
import { useFeedback } from "../../Components/Feedback";
import AdminLayout from "../../Layouts/AdminLayout";

const GROUPS = ["A", "B", "C", "D", "E", "F", "G", "H"];
const PER_PAGE = 12;

type Form = {
  name: string;
  short_name: string;
  category: string;
  group: string;
  description: string;
  is_active: boolean;
};

const EMPTY: Form = { name: "", short_name: "", category: "SMA", group: "", description: "", is_active: true };

export default function AdminTeamsPage({ initialTeams }: { initialTeams?: Team[] }) {
  const { toast, confirmDlg } = useFeedback();
  const [teams, setTeams] = useState<Team[]>(initialTeams ?? []);
  const [q, setQ] = useState("");
  const [fCat, setFCat] = useState("");
  const [fGroup, setFGroup] = useState("");
  const [fActive, setFActive] = useState("");
  const [page, setPage] = useState(1);
  const [drawer, setDrawer] = useState<null | { mode: "add" } | { mode: "edit"; team: Team }>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await apiFetch<{ data: Team[] }>("/teams?active_only=0");
    setTeams(res.data);
  }

  useEffect(() => {
    if (initialTeams !== undefined) return;
    load().catch(() => {});
  }, []);

  // Esc menutup drawer.
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawer(null);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  // Preview file logo baru.
  useEffect(() => {
    if (!logo) return;
    const url = URL.createObjectURL(logo);
    setLogoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [logo]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return teams.filter(
      (t) =>
        (!fCat || t.category === fCat) &&
        (!fGroup || (t.group_name || "").endsWith(fGroup)) &&
        (!fActive || (fActive === "1" ? t.is_active : !t.is_active)) &&
        (!needle || t.name.toLowerCase().includes(needle) || (t.short_name || "").toLowerCase().includes(needle))
    );
  }, [teams, q, fCat, fGroup, fActive]);

  const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const shown = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  function resetFilter() {
    setQ("");
    setFCat("");
    setFGroup("");
    setFActive("");
    setPage(1);
  }

  function openAdd() {
    setForm(EMPTY);
    setLogo(null);
    setLogoPreview(null);
    setRemoveLogo(false);
    setDrawer({ mode: "add" });
  }

  function openEdit(t: Team) {
    setForm({
      name: t.name,
      short_name: t.short_name || "",
      category: t.category,
      group: (t.group_name || "").replace(/^Grup\s+/i, "") || "",
      description: t.description || "",
      is_active: t.is_active,
    });
    setLogo(null);
    setLogoPreview(t.logo_url || null);
    setRemoveLogo(false);
    setDrawer({ mode: "edit", team: t });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("name", form.name.trim());
      fd.append("short_name", form.short_name.trim());
      fd.append("category", form.category);
      fd.append("group_name", form.group ? `Grup ${form.group}` : "");
      fd.append("description", form.description.trim());
      fd.append("is_active", form.is_active ? "1" : "0");
      if (logo) fd.append("logo", logo);
      else if (drawer?.mode === "edit" && removeLogo) fd.append("remove_logo", "1");

      if (drawer?.mode === "edit") {
        await apiFetch(`/teams/${drawer.team.id}`, { method: "POST", body: fd });
        toast.success("Tim berhasil diperbarui.");
      } else {
        await apiFetch("/teams", { method: "POST", body: fd });
        toast.success("Tim berhasil ditambahkan.");
      }
      setDrawer(null);
      revalidateSite(["/tim", "/", "/klasemen", "/bagan"]);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(t: Team) {
    const fd = new FormData();
    fd.append("is_active", t.is_active ? "0" : "1");
    await apiFetch(`/teams/${t.id}`, { method: "POST", body: fd });
    revalidateSite(["/tim", "/", "/klasemen", "/bagan"]);
    await load();
  }

  async function remove(t: Team) {
    const ok = await confirmDlg({
      title: "Hapus Data Ini?",
      detail: `Tim "${t.name}" beserta logo dan seluruh pemainnya akan dihapus permanen.`,
    });
    if (!ok) return;
    try {
      await apiFetch(`/teams/${t.id}`, { method: "DELETE" });
      revalidateSite(["/tim", "/", "/klasemen", "/bagan"]);
      await load();
      toast.success("Data berhasil dihapus.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus.");
    }
  }

  const input =
    "w-full bg-dark border border-border rounded px-3 py-2 text-sm outline-none focus:border-brand";

  return (
    <AdminLayout>
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <h1 className="font-display italic font-bold text-2xl">Kelola Tim</h1>
        <button
          onClick={openAdd}
          className="bg-brand hover:bg-red-700 text-white text-sm font-bold px-4 py-2 rounded-lg transition live-glow"
        >
          + Tambah Tim
        </button>
      </div>
      <p className="text-sm text-muted mb-5">
        {filtered.length} dari {teams.length} tim • klik kartu untuk ubah.
      </p>


      {/* Toolbar */}
      <div className="grid sm:grid-cols-4 gap-2 mb-4">
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1); }}
          placeholder="Cari nama / singkatan..."
          className={input}
        />
        <select value={fCat} onChange={(e) => { setFCat(e.target.value); setPage(1); }} className={input}>
          <option value="">Semua kategori</option>
          <option value="SMA">SMA</option>
          <option value="SMP">SMP</option>
        </select>
        <select value={fGroup} onChange={(e) => { setFGroup(e.target.value); setPage(1); }} className={input}>
          <option value="">Semua grup</option>
          {GROUPS.map((g) => (
            <option key={g} value={g}>Grup {g}</option>
          ))}
        </select>
        <div className="flex gap-2">
          <select value={fActive} onChange={(e) => { setFActive(e.target.value); setPage(1); }} className={input}>
            <option value="">Aktif + nonaktif</option>
            <option value="1">Aktif saja</option>
            <option value="0">Nonaktif saja</option>
          </select>
          {(q || fCat || fGroup || fActive) && (
            <button onClick={resetFilter} className="text-xs text-muted hover:text-white px-2 shrink-0">
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Kartu tim */}
      {shown.length === 0 ? (
        <p className="text-sm text-muted bg-surface border border-border rounded-xl p-6 text-center">
          Tidak ada tim yang cocok. <button onClick={openAdd} className="text-brand font-bold">Tambah tim baru</button>
        </p>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {shown.map((t) => (
            <div
              key={t.id}
              onClick={() => openEdit(t)}
              className={`bg-surface border rounded-xl p-3 flex items-center gap-3 cursor-pointer transition hover:border-brand/60 ${t.is_active ? "border-border" : "border-border opacity-60"}`}
            >
              {t.logo_url ? (
                <img src={t.logo_url} alt="" className="w-12 h-12 rounded-lg object-cover bg-white/10 shrink-0" />
              ) : (
                <span className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center text-muted shrink-0">
                  <i className="fa-solid fa-shield-halved"></i>
                </span>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm truncate">{t.name}</div>
                <div className="flex flex-wrap gap-1 mt-1">
                  <span className="text-[10px] font-bold bg-white/10 px-1.5 py-0.5 rounded">{t.short_name || "-"}</span>
                  <span className="text-[10px] font-bold bg-white/10 px-1.5 py-0.5 rounded">{t.category}</span>
                  <span className="text-[10px] font-bold bg-white/10 px-1.5 py-0.5 rounded">{t.group_name || "-"}</span>
                  {!t.is_active && <span className="text-[10px] font-bold text-yellow-400">NONAKTIF</span>}
                </div>
              </div>
              <div className="flex flex-col gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => toggleActive(t)}
                  title={t.is_active ? "Nonaktifkan" : "Aktifkan"}
                  className={`text-xs px-2 py-1 rounded transition ${t.is_active ? "text-green-400 hover:bg-white/10" : "text-muted hover:bg-white/10"}`}
                >
                  <i className={`fa-solid ${t.is_active ? "fa-toggle-on" : "fa-toggle-off"}`}></i>
                </button>
                <button onClick={() => remove(t)} title="Hapus" className="text-xs text-muted hover:text-brand px-2 py-1 rounded transition">
                  <i className="fa-solid fa-trash"></i>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-5 text-sm">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1.5 rounded bg-surface border border-border text-muted disabled:opacity-40"
          >
            ‹
          </button>
          <span className="text-xs text-muted tabular-nums">
            {page} / {pages}
          </span>
          <button
            disabled={page >= pages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 rounded bg-surface border border-border text-muted disabled:opacity-40"
          >
            ›
          </button>
        </div>
      )}

      {/* Drawer tambah/ubah */}
      {drawer && (
        <div className="fixed inset-0 z-[100]">
          <div className="absolute inset-0 bg-black/60" onClick={() => setDrawer(null)} />
          <aside className="absolute right-0 top-0 h-full w-full max-w-md bg-surface border-l border-border p-5 overflow-y-auto">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-display italic font-bold text-xl">
                {drawer.mode === "add" ? "Tambah Tim" : "Ubah Tim"}
              </h2>
              <button onClick={() => setDrawer(null)} className="text-muted hover:text-white text-lg px-2" aria-label="Tutup">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <p className="text-xs text-muted mb-4">Esc untuk tutup tanpa menyimpan.</p>


            <form onSubmit={submit} className="grid gap-3">
              {/* Logo */}
              <div className="flex items-center gap-3">
                {logoPreview && !removeLogo ? (
                  <img src={logoPreview} alt="" className="w-16 h-16 rounded-xl object-cover bg-white/10" />
                ) : (
                  <span className="w-16 h-16 rounded-xl bg-white/10 flex items-center justify-center text-muted text-xl">
                    <i className="fa-solid fa-shield-halved"></i>
                  </span>
                )}
                <div className="flex-1">
                  <label className="block text-xs text-muted mb-1">Logo (jpg/png/webp, max 2MB)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => { setLogo(e.target.files?.[0] || null); setRemoveLogo(false); }}
                    className="text-xs text-muted w-full"
                  />
                  {drawer.mode === "edit" && drawer.team.logo_path && !logo && (
                    <label className="flex items-center gap-2 text-xs text-muted mt-1.5">
                      <input type="checkbox" checked={removeLogo} onChange={(e) => setRemoveLogo(e.target.checked)} />
                      Hapus logo saat ini
                    </label>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted mb-1">NAMA TIM *</label>
                <input autoFocus className={input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required maxLength={100} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">SINGKATAN</label>
                  <input className={input} value={form.short_name} onChange={(e) => setForm({ ...form, short_name: e.target.value })} maxLength={10} placeholder="SKT" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">KATEGORI *</label>
                  <select className={input} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                    <option value="SMA">SMA</option>
                    <option value="SMP">SMP</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">GRUP</label>
                  <select className={input} value={form.group} onChange={(e) => setForm({ ...form, group: e.target.value })}>
                    <option value="">Belum ada grup</option>
                    {GROUPS.map((g) => (
                      <option key={g} value={g}>Grup {g}</option>
                    ))}
                  </select>
                </div>
                <label className="flex items-end gap-2 text-sm pb-2">
                  <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Aktif
                </label>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">DESKRIPSI</label>
                <textarea className={input} rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>

              <button disabled={saving} className="bg-brand hover:bg-red-700 disabled:opacity-60 text-white text-sm font-bold py-2.5 rounded-lg transition live-glow mt-1">
                {saving ? "Menyimpan..." : drawer.mode === "add" ? "Tambah Tim" : "Simpan Perubahan"}
              </button>
            </form>
          </aside>
        </div>
      )}
    </div>
    </AdminLayout>
  );
}