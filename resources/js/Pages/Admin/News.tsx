import { lazy, Suspense, useEffect, useState } from "react";
import { apiFetch, revalidateSite, type NewsItem } from "../../lib/api";
import AdminLayout from "../../Layouts/AdminLayout";

const TipTapBody = lazy(() => import("../../Components/TipTapBody"));

const EMPTY = { title: "", category: "Turnamen", excerpt: "", body: "", is_published: true };

export default function AdminNewsPage() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState<NewsItem | null>(null);
  const [cover, setCover] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [removeCover, setRemoveCover] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    const res = await apiFetch<{ data: NewsItem[] }>("/news?per_page=50");
    setItems(res.data);
  }

  useEffect(() => {
    load().catch(() => {});
  }, []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawer(false);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  useEffect(() => {
    if (!cover) return;
    const url = URL.createObjectURL(cover);
    setCoverPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [cover]);

  function openAdd() {
    setForm(EMPTY);
    setCover(null);
    setCoverPreview(null);
    setRemoveCover(false);
    setEditing(null);
    setMsg("");
    setDrawer(true);
  }

  function startEdit(n: NewsItem) {
    setEditing(n);
      setForm({
        title: n.title,
        category: n.category,
        excerpt: n.excerpt || "",
        body: n.body || "",
        is_published: n.is_published,
      });
      setCover(null);
    setCoverPreview(n.cover_url || null);
    setRemoveCover(false);
    setMsg("");
    setDrawer(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    try {
      const fd = new FormData();
      fd.append("title", form.title);
      fd.append("category", form.category);
      fd.append("excerpt", form.excerpt);
      fd.append("body", form.body);
      fd.append("is_published", form.is_published ? "1" : "0");
      if (cover) fd.append("cover", cover);
      else if (editing && removeCover) fd.append("remove_cover", "1");

      if (editing) {
        await apiFetch(`/news/${editing.id}`, { method: "POST", body: fd });
        setMsg("Berita diperbarui.");
      } else {
        await apiFetch("/news", { method: "POST", body: fd });
        setMsg("Berita ditambahkan.");
      }
      setDrawer(false);
      setEditing(null);
      revalidateSite(["/", "/berita"]);
      await load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Gagal menyimpan.");
    } finally {
      setLoading(false);
    }
  }

  async function remove(n: NewsItem) {
    if (!confirm(`Hapus "${n.title}"?`)) return;
    await apiFetch(`/news/${n.id}`, { method: "DELETE" });
    revalidateSite(["/", "/berita"]);
    await load();
  }

  const input =
    "w-full bg-dark border border-border rounded px-3 py-2 text-sm outline-none focus:border-brand";
  const showCover: string | null = !removeCover ? coverPreview : null;

  return (
    <AdminLayout>
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <h1 className="font-display italic font-bold text-2xl">Kelola Berita</h1>
        <button
          onClick={openAdd}
          className="bg-brand hover:bg-red-700 text-white text-sm font-bold px-4 py-2 rounded-lg transition live-glow"
        >
          + Tulis Berita
        </button>
      </div>
      <p className="text-sm text-muted mb-5">{items.length} berita • sampul otomatis 16:9 WebP.</p>

      {msg && !drawer && <p className="mb-4 text-xs bg-white/5 border border-border rounded px-3 py-2">{msg}</p>}

      <div className="grid md:grid-cols-2 gap-4">
        {items.map((n) => (
          <div key={n.id} className="bg-surface border border-border rounded-xl overflow-hidden">
            {n.cover_url && <img src={n.cover_url} alt="" loading="lazy" className="aspect-video w-full object-cover" />}
            <div className="p-4">
              <span className="text-[10px] font-bold bg-brand px-2 py-0.5 rounded uppercase">{n.category}</span>
              <h3 className="font-bold mt-2 leading-snug">{n.title}</h3>
              <p className="text-xs text-muted mt-1 line-clamp-2">{n.excerpt}</p>
              <div className="mt-3 flex gap-3 text-xs">
                <button onClick={() => startEdit(n)} className="text-muted hover:text-white">Ubah</button>
                <button onClick={() => remove(n)} className="text-muted hover:text-brand">Hapus</button>
                {!n.is_published && <span className="text-yellow-400">Draf</span>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {drawer && (
        <div className="fixed inset-0 z-[100]">
          <div className="absolute inset-0 bg-black/60" onClick={() => setDrawer(false)} />
          <aside className="absolute right-0 top-0 h-full w-full max-w-2xl bg-surface border-l border-border p-5 overflow-y-auto">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-display italic font-bold text-xl">
                {editing ? "Ubah Berita" : "Tulis Berita"}
              </h2>
              <button onClick={() => setDrawer(false)} className="text-muted hover:text-white text-lg px-2" aria-label="Tutup">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <p className="text-xs text-muted mb-4">Esc untuk tutup tanpa menyimpan.</p>

            {msg && <p className="mb-3 text-xs bg-white/5 border border-border rounded px-3 py-2">{msg}</p>}

            <form onSubmit={submit} className="grid gap-3">
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">JUDUL *</label>
                <input className={input} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required maxLength={200} />
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">KATEGORI</label>
                  <input className={input} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} maxLength={50} />
                </div>
                <label className="flex items-center gap-2 text-sm pt-5">
                  <input type="checkbox" checked={form.is_published} onChange={(e) => setForm({ ...form, is_published: e.target.checked })} /> Tayang
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted mb-1">SAMPUL (otomatis 16:9 WebP, max 8MB)</label>
                {showCover ? (
                  <img src={showCover} alt="" className="aspect-video w-full object-cover rounded-lg bg-dark" />
                ) : (
                  <div className="aspect-video w-full rounded-lg bg-dark border border-dashed border-border flex items-center justify-center text-muted text-xs">
                    Belum ada sampul
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => { setCover(e.target.files?.[0] || null); setRemoveCover(false); }}
                  className="text-xs text-muted w-full mt-2"
                />
                {editing && editing.cover_path && !cover && (
                  <label className="flex items-center gap-2 text-xs text-muted mt-1.5">
                    <input type="checkbox" checked={removeCover} onChange={(e) => setRemoveCover(e.target.checked)} />
                    Hapus sampul saat ini
                  </label>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted mb-1">RINGKASAN</label>
                <textarea className={input} rows={2} value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted mb-1">ISI BERITA</label>
                <Suspense fallback={<p className="text-xs text-muted">Memuat editor...</p>}>
                  <TipTapBody
                    key={editing ? `edit-${editing.id}` : "new"}
                    value={form.body}
                    onChange={(html) => setForm((f) => ({ ...f, body: html }))}
                  />
                </Suspense>
              </div>

              <button disabled={loading} className="bg-brand hover:bg-red-700 disabled:opacity-60 text-white text-sm font-bold py-2.5 rounded-lg transition live-glow mt-1">
                {loading ? "Menyimpan..." : editing ? "Simpan Perubahan" : "Terbitkan"}
              </button>
            </form>
          </aside>
        </div>
      )}
    </div>
    </AdminLayout>
  );
}
