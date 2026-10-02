import { useEffect, useState } from "react";
import { router } from "@inertiajs/react";
import { apiFetch } from "../../lib/api";
import AdminLayout from "../../Layouts/AdminLayout";
import { useFeedback } from "../../Components/Feedback";

type Photo = { id: number; album: string; photo_url?: string | null };
type Album = { id: number; title: string; slug: string };

export default function AdminGalleryDetailPage({ album, initialPhotos }: { album: Album; initialPhotos?: Photo[] }) {
  const { toast, confirmDlg } = useFeedback();
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos ?? []);

  useEffect(() => {
    if (initialPhotos !== undefined) return;
    apiFetch<{ data: Photo[] }>(`/gallery?album_id=${album.id}&per_page=100`)
      .then((res) => setPhotos(res.data))
      .catch(() => {});
  }, [album.id]);

  async function removePhoto(p: Photo) {
    const ok = await confirmDlg({
      title: "Hapus Data Ini?",
      detail: `Foto dari album "${album.title}" akan dihapus permanen dari galeri dan storage.`,
    });
    if (!ok) return;
    // Optimistis: singkirkan dari tampilan dulu, lalu hapus di server.
    setPhotos((prev) => prev.filter((x) => x.id !== p.id));
    try {
      await apiFetch(`/gallery/${p.id}`, { method: "DELETE" });
      toast.success("Data berhasil dihapus.");
    } catch (err) {
      // Gagal: kembalikan + tampilkan sebab sebenarnya.
      setPhotos((prev) => [...prev, p].sort((a, b) => a.id - b.id));
      toast.error(err instanceof Error ? err.message : "Gagal menghapus.");
    }
  }

  async function removeAlbum() {
    const ok = await confirmDlg({
      title: "Hapus Album Ini?",
      detail: `Album "${album.title}" beserta seluruh ${photos.length} fotonya akan dihapus permanen dari galeri dan storage.`,
      confirmLabel: "Ya, Hapus Album",
    });
    if (!ok) return;
    try {
      const res = await apiFetch<{ message: string }>(`/gallery/albums/${album.id}`, { method: "DELETE" });
      toast.success(res.message);
      router.visit("/admin/gallery");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus album.");
    }
  }

  return (
    <AdminLayout>
    <div className="max-w-4xl">
      <button onClick={() => router.visit("/admin/gallery")} className="text-xs text-muted hover:text-white mb-3">
        ← Kembali ke Daftar Album
      </button>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <h1 className="font-display italic font-bold text-2xl">{album.title}</h1>
        <div className="flex gap-2">
          <a
            href={`/galeri/${album.slug}`}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-bold bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg transition"
          >
            Lihat publik ↗
          </a>
          <button onClick={() => router.visit("/admin/gallery/create")} className="text-xs font-bold bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg transition">
            + Tambah Foto
          </button>
          <button onClick={removeAlbum} className="text-xs text-muted hover:text-red-400 px-2">
            Hapus album
          </button>
        </div>
      </div>
      <p className="text-sm text-muted mb-5">
        {photos.length}/20 foto • slug: <code className="text-gray-300 bg-dark px-1.5 py-0.5 rounded">{album.slug}</code>
      </p>

      {photos.length === 0 ? (
        <p className="text-sm text-muted bg-surface border border-border rounded-xl p-6 text-center">
          Belum ada foto di album ini.
        </p>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {photos.map((p) => (
            <div key={p.id} className="relative group rounded-lg overflow-hidden border border-border">
              <img src={p.photo_url || ""} alt={album.title} loading="lazy" className="w-full aspect-square object-cover" />
              <button
                onClick={() => removePhoto(p)}
                className="absolute top-1 right-1 w-6 h-6 rounded bg-black/60 text-white text-[11px] opacity-0 group-hover:opacity-100 transition"
                title="Hapus foto"
              >
                <i className="fa-solid fa-trash"></i>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
    </AdminLayout>
  );
}
