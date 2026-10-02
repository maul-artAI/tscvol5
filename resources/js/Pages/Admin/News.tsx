import { useEffect, useState } from "react";
import { router } from "@inertiajs/react";
import { apiFetch, revalidateSite, type NewsItem } from "../../lib/api";
import { useFeedback } from "../../Components/Feedback";
import AdminLayout from "../../Layouts/AdminLayout";

export default function AdminNewsPage({ initialNews }: { initialNews?: NewsItem[] }) {
  const { toast, confirmDlg } = useFeedback();
  const [items, setItems] = useState<NewsItem[]>(initialNews ?? []);

  async function load() {
    const res = await apiFetch<{ data: NewsItem[] }>("/news?per_page=50");
    setItems(res.data);
  }

  useEffect(() => {
    if (initialNews !== undefined) return;
    load().catch(() => {});
  }, []);

  async function remove(n: NewsItem) {
    const ok = await confirmDlg({
      title: "Hapus Data Ini?",
      detail: `Berita "${n.title}" beserta gambar sampulnya akan dihapus permanen.`,
    });
    if (!ok) return;
    try {
      await apiFetch(`/news/${n.id}`, { method: "DELETE" });
      revalidateSite(["/", "/berita"]);
      await load();
      toast.success("Data berhasil dihapus.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus.");
    }
  }

  return (
    <AdminLayout>
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <h1 className="font-display italic font-bold text-2xl">Kelola Berita</h1>
        <button
          onClick={() => router.visit("/admin/news/create")}
          className="bg-brand hover:bg-red-700 text-white text-sm font-bold px-4 py-2 rounded-lg transition live-glow"
        >
          + Tulis Berita
        </button>
      </div>
      <p className="text-sm text-muted mb-5">{items.length} berita • sampul otomatis 16:9 WebP.</p>

      {items.length === 0 ? (
        <p className="text-sm text-muted bg-surface border border-border rounded-xl p-6 text-center">
          Belum ada berita. <button onClick={() => router.visit("/admin/news/create")} className="text-brand font-bold">Tulis yang pertama</button>
        </p>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {items.map((n) => (
            <div key={n.id} className="bg-surface border border-border rounded-xl overflow-hidden">
              {n.cover_url && <img src={n.cover_url} alt="" loading="lazy" className="aspect-video w-full object-cover" />}
              <div className="p-4">
                <span className="text-[10px] font-bold bg-brand px-2 py-0.5 rounded uppercase">{n.category}</span>
                <h3 className="font-bold mt-2 leading-snug">{n.title}</h3>
                <p className="text-xs text-muted mt-1 line-clamp-2">{n.excerpt}</p>
                <div className="mt-3 flex gap-3 text-xs">
                  <button onClick={() => router.visit(`/admin/news/${n.id}/edit`)} className="text-muted hover:text-white">Ubah</button>
                  <button onClick={() => remove(n)} className="text-muted hover:text-brand">Hapus</button>
                  {!n.is_published && <span className="text-yellow-400">Draf</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
    </AdminLayout>
  );
}
