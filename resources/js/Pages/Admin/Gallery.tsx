import { useEffect, useState } from "react";
import { router } from "@inertiajs/react";
import { apiFetch } from "../../lib/api";
import AdminLayout from "../../Layouts/AdminLayout";

type Album = { id: number; title: string; slug: string; count: number; cover_url?: string | null };
type Paged<T> = { data: T[]; current_page: number; last_page: number; total: number };

export default function AdminGalleryPage() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [totalAlbums, setTotalAlbums] = useState(0);

  async function loadAlbums(p = 1) {
    const a = await apiFetch<Paged<Album>>(`/gallery/albums?page=${p}`);
    setAlbums(a.data);
    setPage(a.current_page);
    setLastPage(a.last_page);
    setTotalAlbums(a.total);
  }

  useEffect(() => {
    loadAlbums(1).catch(() => {});
  }, []);

  useEffect(() => {
    loadAlbums(page).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  return (
    <AdminLayout>
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <h1 className="font-display italic font-bold text-2xl">Kelola Galeri</h1>
        <button
          onClick={() => router.visit("/admin/gallery/create")}
          className="bg-brand hover:bg-red-700 text-white text-sm font-bold px-4 py-2 rounded-lg transition live-glow"
        >
          + Tambah Galeri
        </button>
      </div>
      <p className="text-sm text-muted mb-5">{totalAlbums} album • klik kartu untuk melihat isi.</p>

      {albums.length === 0 ? (
        <p className="text-sm text-muted bg-surface border border-border rounded-xl p-6 text-center max-w-2xl">
          Belum ada album. <button onClick={() => router.visit("/admin/gallery/create")} className="text-brand font-bold">Tambah galeri pertama</button>
        </p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl">
          {albums.map((a) => (
            <button
              key={a.id}
              onClick={() => router.visit(`/admin/gallery/${a.slug}`)}
              className="text-left bg-surface border border-border rounded-xl overflow-hidden hover:border-brand/60 hover:-translate-y-0.5 transition-all duration-200"
            >
              {a.cover_url ? (
                <img src={a.cover_url} alt={a.title} loading="lazy" className="aspect-video w-full object-cover" />
              ) : (
                <div className="aspect-video w-full bg-dark flex items-center justify-center text-muted">
                  <i className="fa-regular fa-images text-3xl"></i>
                </div>
              )}
              <div className="p-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-bold leading-snug text-sm truncate">{a.title}</h3>
                  <p className="text-xs text-muted mt-0.5">{a.count}/20 foto • /{a.slug}</p>
                </div>
                <i className="fa-solid fa-chevron-right text-muted text-xs shrink-0"></i>
              </div>
            </button>
          ))}
        </div>
      )}
      {lastPage > 1 && (
        <div className="flex items-center gap-2 max-w-4xl mt-4 text-xs">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-3 py-1.5 rounded-lg bg-surface border border-border text-muted hover:text-white disabled:opacity-40 transition"
          >
            ← Sebelumnya
          </button>
          <span className="text-muted tabular-nums">Halaman {page} / {lastPage} • {totalAlbums} album</span>
          <button
            onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
            disabled={page >= lastPage}
            className="px-3 py-1.5 rounded-lg bg-surface border border-border text-muted hover:text-white disabled:opacity-40 transition"
          >
            Berikutnya →
          </button>
        </div>
      )}
    </div>
    </AdminLayout>
  );
}
