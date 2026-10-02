import { lazy, Suspense, useState } from "react";
import { Link, router } from "@inertiajs/react";
import { apiFetch } from "../../lib/api";
import type { NewsItem } from "../../lib/api";
import AdminLayout from "../../Layouts/AdminLayout";
import { useFeedback } from "../../Components/Feedback";

const TipTapBody = lazy(() => import("../../Components/TipTapBody"));

const input =
  "w-full bg-dark border border-border rounded px-3 py-2 text-sm outline-none focus:border-brand";

export default function AdminNewsFormPage({ item }: { item?: NewsItem | null }) {
  const { toast } = useFeedback();
  const editing = !!item;
  const [title, setTitle] = useState(item?.title || "");
  const [category, setCategory] = useState(item?.category || "Turnamen");
  const [excerpt, setExcerpt] = useState(item?.excerpt || "");
  const [body, setBody] = useState(item?.body || "");
  const [published, setPublished] = useState(item ? !!item.is_published : true);
  const [cover, setCover] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(item?.cover_url || null);
  const [removeCover, setRemoveCover] = useState(false);
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Judul wajib diisi.");
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("title", title.trim());
      fd.append("category", category.trim() || "Turnamen");
      fd.append("excerpt", excerpt.trim());
      fd.append("body", body);
      fd.append("is_published", published ? "1" : "0");
      if (cover) fd.append("cover", cover);
      else if (editing && removeCover) fd.append("remove_cover", "1");
      if (editing) {
        await apiFetch(`/news/${item!.id}`, { method: "POST", body: fd });
        toast.success("Berita berhasil diperbarui.");
      } else {
        await apiFetch("/news", { method: "POST", body: fd });
        toast.success("Berita berhasil ditambahkan.");
      }
      router.visit("/admin/news");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminLayout>
    <div className="max-w-4xl">
      <button onClick={() => router.visit("/admin/news")} className="text-xs text-muted hover:text-white mb-3">
        ← Kembali ke daftar berita
      </button>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <h1 className="font-display italic font-bold text-2xl">{editing ? "Ubah Berita" : "Tulis Berita"}</h1>
        <button
          type="button"
          onClick={() => setPreview((p) => !p)}
          className={`text-xs font-bold px-4 py-2 rounded-lg transition ${preview ? "bg-brand text-white" : "bg-white/10 hover:bg-white/20 text-white"}`}
        >
          {preview ? "✎ Kembali Mengedit" : "👁 Pratinjau"}
        </button>
      </div>
      <p className="text-sm text-muted mb-5">{editing ? `Menyunting "${item!.title}"` : "Tulis berita baru di halaman ini."}</p>

      {preview ? (
        <article className="bg-surface border border-border rounded-xl overflow-hidden">
          {(coverPreview || (!removeCover && item?.cover_url)) && (
            <img src={coverPreview || item?.cover_url || ""} alt="" className="w-full max-h-80 object-cover" />
          )}
          <div className="p-5 sm:p-8">
            <span className="text-[10px] font-bold bg-brand px-2 py-1 rounded uppercase">{category || "Turnamen"}</span>
            <h1 className="font-display font-bold text-2xl sm:text-3xl mt-3">{title || "(Tanpa judul)"}</h1>
            {excerpt && <p className="text-sm text-muted mt-2">{excerpt}</p>}
            <div
              className="rich-body text-sm mt-4 [&_img]:rounded-xl [&_img]:my-3 [&_img]:max-w-full"
              dangerouslySetInnerHTML={{ __html: body || "<p class='text-muted'>(Belum ada isi)</p>" }}
            />
          </div>
        </article>
      ) : (
        <form onSubmit={submit} className="bg-surface border border-border rounded-xl p-4 sm:p-5 grid gap-3">
          <div>
            <label className="block text-xs font-semibold text-muted mb-1">JUDUL</label>
            <input className={input} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={150} required />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">KATEGORI</label>
              <input className={input} value={category} onChange={(e) => setCategory(e.target.value)} maxLength={50} />
            </div>
            <label className="flex items-center gap-2 text-sm pt-5">
              <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} /> Tayang
            </label>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted mb-1">RINGKASAN</label>
            <textarea className={input} rows={2} value={excerpt} onChange={(e) => setExcerpt(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted mb-1">SAMPUL</label>
            {(coverPreview || (!removeCover && item?.cover_url)) && (
              <img src={coverPreview || item?.cover_url || ""} alt="" className="w-40 aspect-video object-cover rounded-lg mb-2" />
            )}
            <div className="flex items-center gap-3">
              <label className="cursor-pointer bg-white/10 hover:bg-white/20 text-xs font-bold px-3 py-2 rounded-lg transition">
                Pilih gambar...
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    setCover(f);
                    setRemoveCover(false);
                    setCoverPreview(f ? URL.createObjectURL(f) : item?.cover_url || null);
                  }}
                />
              </label>
              {(coverPreview || item?.cover_url) && !removeCover && (
                <button
                  type="button"
                  onClick={() => { setCover(null); setCoverPreview(null); setRemoveCover(true); }}
                  className="text-xs text-muted hover:text-red-400"
                >
                  Hapus sampul
                </button>
              )}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted mb-1">ISI BERITA</label>
            <Suspense fallback={<p className="text-xs text-muted">Memuat editor...</p>}>
              <TipTapBody value={body} onChange={setBody} />
            </Suspense>
          </div>
          <div className="flex gap-2">
            <button disabled={saving} className="bg-brand hover:bg-red-700 disabled:opacity-60 text-white text-sm font-bold px-5 py-2.5 rounded-lg transition">
              {saving ? "Menyimpan..." : editing ? "Simpan Perubahan" : "Terbitkan Berita"}
            </button>
            <button type="button" onClick={() => router.visit("/admin/news")} className="bg-white/10 hover:bg-white/20 text-white text-sm font-bold px-5 py-2.5 rounded-lg transition">
              Batal
            </button>
          </div>
        </form>
      )}
    </div>
    </AdminLayout>
  );
}
