import { useEffect, useState } from "react";
import BackButton from "../../Components/BackButton";
import { apiFetch } from "../../lib/api";
import PublicLayout from "../../Layouts/PublicLayout";
import Reveal from "../../Components/Reveal";

type Photo = { id: number; photo_url?: string | null };
type AlbumDetail = { id: number; title: string; slug: string; photos: Photo[] };

export default function GaleriShowPage({ slug }: { slug: string }) {
  const [album, setAlbum] = useState<AlbumDetail | null>(null);
  const [missing, setMissing] = useState(false);
  const [lightIdx, setLightIdx] = useState<number | null>(null);
  const light = lightIdx !== null ? album?.photos[lightIdx] ?? null : null;

  useEffect(() => {
    apiFetch<{ data: AlbumDetail }>(`/gallery/albums/${slug}`, { auth: false })
      .then((res) => setAlbum(res.data))
      .catch(() => setMissing(true));
  }, [slug]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightIdx(null);
      if (lightIdx === null || !album) return;
      if (e.key === "ArrowRight") setLightIdx((i) => (i === null ? null : (i + 1) % album.photos.length));
      if (e.key === "ArrowLeft") setLightIdx((i) => (i === null ? null : (i - 1 + album.photos.length) % album.photos.length));
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [lightIdx, album]);

  return (
    <PublicLayout>
    <main className="min-h-screen bg-dark text-white">
      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Reveal>
        <BackButton href="/galeri" label="Semua album" />
        {missing ? (
          <p className="text-sm text-muted bg-surface border border-border rounded-xl p-6 text-center mt-4">
            Album tidak ditemukan.
          </p>
        ) : !album ? (
          <p className="text-sm text-muted mt-4">Memuat album...</p>
        ) : (
          <>
            <h1 className="font-display italic font-bold text-3xl md:text-4xl uppercase mt-4">{album.title}</h1>
            <p className="text-sm text-muted mt-1">{album.photos.length} foto.</p>
          </>
        )}
        </Reveal>

        {album && (
          <Reveal delay={120}>
          {album.photos.length === 0 ? (
            <p className="text-sm text-muted bg-surface border border-border rounded-xl p-6 text-center mt-6">
              Belum ada foto di album ini.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mt-6">
              {album.photos.map((p, i) => (
                <button key={p.id} onClick={() => setLightIdx(i)} className="group rounded-xl overflow-hidden border border-border text-left">
                  <img src={p.photo_url || ""} alt={album.title} loading="lazy" className="w-full aspect-square object-cover group-hover:scale-105 transition duration-500" />
                </button>
              ))}
            </div>
          )}
          </Reveal>
        )}
      </div>
    </main>

    {light && album && (
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4" onClick={() => setLightIdx(null)}>
        <div className="absolute inset-0 bg-black/85"></div>
        <button
          onClick={(e) => { e.stopPropagation(); setLightIdx((lightIdx! - 1 + album.photos.length) % album.photos.length); }}
          className="absolute left-2 sm:left-6 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
          aria-label="Foto sebelumnya"
        >
          <i className="fa-solid fa-chevron-left"></i>
        </button>
        <figure className="relative max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
          <img src={light.photo_url || ""} alt={album.title} className="w-full max-h-[80vh] object-contain rounded-xl" />
          <figcaption className="text-center text-sm text-muted mt-2">
            {album.title} • {(lightIdx ?? 0) + 1} / {album.photos.length}
          </figcaption>
          <button onClick={() => setLightIdx(null)} className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white" aria-label="Tutup">
            <i className="fa-solid fa-xmark text-xs"></i>
          </button>
        </figure>
        <button
          onClick={(e) => { e.stopPropagation(); setLightIdx((lightIdx! + 1) % album.photos.length); }}
          className="absolute right-2 sm:right-6 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
          aria-label="Foto berikutnya"
        >
          <i className="fa-solid fa-chevron-right"></i>
        </button>
      </div>
    )}
    </PublicLayout>
  );
}
