import { useEffect, useState } from "react";
import { Link } from "@inertiajs/react";
import { apiFetch } from "../../lib/api";
import PublicLayout from "../../Layouts/PublicLayout";
import Reveal from "../../Components/Reveal";

type Album = { id: number; title: string; slug: string; count: number; cover_url?: string | null };

type Paged<T> = { data: T[]; current_page: number; last_page: number; total: number };

export default function GaleriPage() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    apiFetch<Paged<Album>>(`/gallery/albums?page=${page}&per_page=12`, { auth: false })
      .then((res) => {
        setAlbums(res.data);
        setPage(res.current_page);
        setLastPage(res.last_page);
        setTotal(res.total);
      })
      .catch(() => {});
  }, [page]);

  return (
    <PublicLayout>
    <main className="min-h-screen bg-dark text-white">
      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Reveal>
        <h1 className="font-display italic font-bold text-4xl md:text-5xl uppercase mt-3">
          Galeri <span className="text-brand">Turnamen</span>
        </h1>
        <p className="text-sm text-muted mt-2">Album momen terbaik dari setiap laga.</p>
        </Reveal>

        <Reveal delay={120}>
        {albums.length === 0 ? (
          <p className="text-sm text-muted bg-surface border border-border rounded-xl p-6 text-center mt-6">
            Belum ada album galeri.
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
            {albums.map((a) => (
              <Link key={a.id} href={`/galeri/${a.slug}`} className="group bg-surface border border-border rounded-xl overflow-hidden hover:border-brand/60 transition">
                {a.cover_url ? (
                  <img src={a.cover_url} alt={a.title} loading="lazy" className="aspect-video w-full object-cover group-hover:scale-105 transition duration-500" />
                ) : (
                  <div className="aspect-video w-full bg-dark flex items-center justify-center text-muted">
                    <i className="fa-regular fa-images text-3xl"></i>
                  </div>
                )}
                <div className="p-4 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-bold leading-snug truncate">{a.title}</h3>
                    <p className="text-xs text-muted mt-0.5">{a.count} foto</p>
                  </div>
                  <i className="fa-solid fa-arrow-right text-muted group-hover:text-brand transition shrink-0"></i>
                </div>
              </Link>
            ))}
          </div>
        )}
        {lastPage > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6 text-xs">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 rounded-lg bg-surface border border-border text-muted hover:text-white disabled:opacity-40 transition"
            >
              ← Sebelumnya
            </button>
            <span className="text-muted tabular-nums">Halaman {page} / {lastPage} • {total} album</span>
            <button
              onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
              disabled={page >= lastPage}
              className="px-3 py-1.5 rounded-lg bg-surface border border-border text-muted hover:text-white disabled:opacity-40 transition"
            >
              Berikutnya →
            </button>
          </div>
        )}
        </Reveal>
      </div>
    </main>
    </PublicLayout>
  );
}
