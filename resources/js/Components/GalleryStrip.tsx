import { useEffect, useState } from "react";
import { Link } from "@inertiajs/react";
import { apiFetch } from "../lib/api";
import Reveal from "./Reveal";

type Album = { id: number; title: string; slug: string; count: number; cover_url?: string | null };

export default function GalleryStrip() {
  const [albums, setAlbums] = useState<Album[]>([]);

  useEffect(() => {
    apiFetch<{ data: Album[]; current_page: number; last_page: number }>("/gallery/albums", { auth: false })
      .then((res) => setAlbums(res.data.slice(0, 3)))
      .catch(() => {});
  }, []);

  if (albums.length === 0) {
    return (
      <Reveal>
        <div className="mt-0 mb-8">
          <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
            <h2 className="font-bold text-xl flex items-center gap-2 tracking-wide uppercase">
              <i className="fa-regular fa-images text-brand"></i> Galeri Turnamen
            </h2>
            <Link href="/galeri" className="text-sm text-muted hover:text-white transition flex items-center gap-2">
              Lihat Semua Album <i className="fa-solid fa-arrow-right"></i>
            </Link>
          </div>
          <div className="flex flex-col items-center justify-center text-center py-10 border border-dashed border-white/15 rounded-xl">
            <i className="fa-regular fa-images text-3xl text-muted mb-3"></i>
            <p className="font-bold text-white">Belum ada album galeri</p>
            <p className="text-sm text-muted mt-1 max-w-md">Dokumentasi momen terbaik turnamen akan tampil di sini.</p>
          </div>
        </div>
      </Reveal>
    );
  }

  return (
    <Reveal>
      <div className="mt-0 mb-8">
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
          <h2 className="font-bold text-xl flex items-center gap-2 tracking-wide uppercase">
            <i className="fa-regular fa-images text-brand"></i> Galeri Turnamen
          </h2>
          <Link href="/galeri" className="text-sm text-muted hover:text-white transition flex items-center gap-2">
            Lihat Semua Album <i className="fa-solid fa-arrow-right"></i>
          </Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
      </div>
    </Reveal>
  );
}
