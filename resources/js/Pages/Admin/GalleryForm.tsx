import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { router } from "@inertiajs/react";
import AdminLayout from "../../Layouts/AdminLayout";
import { useFeedback } from "../../Components/Feedback";

type Album = { id: number; title: string; slug: string; count: number };

type Item = { file: File; progress: number; status: "antre" | "unggah" | "ok" | "gagal"; error?: string };

const input =
  "w-full bg-dark border border-border rounded px-3 py-2 text-sm outline-none focus:border-brand";

const MAX_TOTAL = 20;

export default function AdminGalleryFormPage() {
  const { toast } = useFeedback();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [albumId, setAlbumId] = useState("");
  const [newAlbum, setNewAlbum] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [running, setRunning] = useState(false);
  const lastSlug = useRef<string | null>(null);

  useEffect(() => {
    axios
      .get("/api/v1/gallery/albums?per_page=100")
      .then((res) => setAlbums(res.data.data))
      .catch(() => {});
  }, []);

  function pick(list: FileList | null) {
    if (!list || running) return;
    const imgs = Array.from(list).filter((f) => f.type.startsWith("image/"));
    if (imgs.length === 0) {
      toast.error("Pilih file gambar.");
      return;
    }
    const bad = imgs.find((f) => f.size > 8 * 1024 * 1024);
    if (bad) {
      toast.error(`"${bad.name}" melebihi 8MB.`);
      return;
    }
    const room = MAX_TOTAL - items.length;
    if (imgs.length > room) {
      toast.error(`Maksimal ${MAX_TOTAL} foto per sesi (sisa slot: ${room}).`);
      return;
    }
    setItems((prev) => [...prev, ...imgs.map((file) => ({ file, progress: 0, status: "antre" as const }))]);
  }

  function removeAt(i: number) {
    if (running) return;
    setItems((prev) => prev.filter((_, x) => x !== i));
  }

  async function start() {
    const title = newAlbum.trim();
    if (!albumId && !title) {
      toast.error("Pilih album atau tulis judul album baru.");
      return;
    }
    const pending = items.filter((it) => it.status === "antre" || it.status === "gagal");
    if (pending.length === 0) return;
    setRunning(true);
    let ok = 0;
    const fails: string[] = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.status !== "antre" && it.status !== "gagal") continue;
      setItems((prev) => prev.map((x, xi) => (xi === i ? { ...x, status: "unggah", progress: 0, error: undefined } : x)));
      try {
        const fd = new FormData();
        if (albumId) fd.append("album_id", albumId);
        else fd.append("album", title);
        fd.append("photos[]", it.file);
        await axios.post("/api/v1/gallery", fd, {
          headers: { Accept: "application/json" },
          onUploadProgress: (e) => {
            const pct = e.total ? Math.round((e.loaded / e.total) * 100) : 0;
            setItems((prev) => prev.map((x, xi) => (xi === i ? { ...x, progress: pct } : x)));
          },
        }).then((res) => {
          const slug = (res.data as { album_slug?: string })?.album_slug;
          if (slug) lastSlug.current = slug;
        });
        ok++;
        setItems((prev) => prev.map((x, xi) => (xi === i ? { ...x, status: "ok", progress: 100 } : x)));
      } catch (err) {
        const msg = axios.isAxiosError(err)
          ? (err.response?.data as { message?: string } | undefined)?.message || `Gagal (${err.response?.status || "network"})`
          : "Gagal mengunggah.";
        fails.push(it.file.name);
        setItems((prev) => prev.map((x, xi) => (xi === i ? { ...x, status: "gagal", error: msg } : x)));
      }
    }
    setRunning(false);
    if (fails.length === 0) {
      toast.success(`${ok} foto berhasil diunggah.`);
      const slug = lastSlug.current;
      lastSlug.current = null;
      if (slug && ok > 0) {
        router.visit(`/admin/gallery/${slug}`);
        return;
      }
    } else toast.error(`${ok} berhasil, ${fails.length} gagal: ${fails.slice(0, 3).join(", ")}${fails.length > 3 ? "…" : ""}`);
  }

  const done = items.filter((it) => it.status === "ok").length;

  return (
    <AdminLayout>
    <div className="max-w-2xl">
      <button onClick={() => router.visit("/admin/gallery")} className="text-xs text-muted hover:text-white mb-3">
        ← Kembali ke daftar galeri
      </button>
      <h1 className="font-display italic font-bold text-2xl mb-1">Tambah Galeri</h1>
      <p className="text-sm text-muted mb-5">Maksimal {MAX_TOTAL} foto • dikirim satu per satu agar server ringan.</p>

      <div className="bg-surface border border-border rounded-xl p-4 grid gap-3 mb-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-muted mb-1">ALBUM YANG ADA</label>
            <select value={albumId} onChange={(e) => { setAlbumId(e.target.value); setNewAlbum(""); }} className={input} disabled={running}>
              <option value="">— Pilih album —</option>
              {albums.map((a) => (
                <option key={a.id} value={a.id}>{a.title} ({a.count}/{MAX_TOTAL})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted mb-1">ATAU ALBUM BARU</label>
            <input
              className={input}
              value={newAlbum}
              onChange={(e) => { setNewAlbum(e.target.value); setAlbumId(""); }}
              placeholder="Judul album baru"
              maxLength={100}
              disabled={running}
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted mb-1">FOTO (MAKS {MAX_TOTAL})</label>
          <input type="file" accept=".jpg,.jpeg,.png,.webp" multiple onChange={(e) => pick(e.target.files)} disabled={running} className="text-xs text-muted w-full" />
        </div>
      </div>

      {items.length > 0 && (
        <div className="bg-surface border border-border rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-bold text-sm uppercase tracking-wide">Antrean ({done}/{items.length})</h2>
            <div className="w-40 h-1.5 bg-dark rounded-full overflow-hidden">
              <div
                className="h-full bg-brand transition-all"
                style={{ width: `${items.length === 0 ? 0 : Math.round((done / items.length) * 100)}%` }}
              ></div>
            </div>
          </div>
          <div className="flex flex-col gap-2 mt-3">
            {items.map((it, i) => (
              <div key={i} className="flex items-center gap-3 bg-dark border border-border rounded-lg p-2">
                <span className="text-xs font-medium truncate flex-1">{it.file.name}</span>
                <span className="text-[10px] text-muted tabular-nums w-24 shrink-0 text-right">
                  {it.status === "antre" && "Antre"}
                  {it.status === "unggah" && `${it.progress}%`}
                  {it.status === "ok" && <span className="text-green-400">Berhasil</span>}
                  {it.status === "gagal" && <span className="text-red-400" title={it.error}>Gagal — klik Unggah untuk ulangi</span>}
                </span>
                <div className="w-24 h-1.5 bg-surface rounded-full overflow-hidden shrink-0">
                  <div
                    className={`h-full transition-all ${it.status === "gagal" ? "bg-red-500" : it.status === "ok" ? "bg-green-500" : "bg-brand"}`}
                    style={{ width: `${it.progress}%` }}
                  ></div>
                </div>
                {!running && it.status !== "ok" && (
                  <button onClick={() => removeAt(i)} className="text-muted hover:text-red-400 text-xs px-1" title="Hapus dari antrean">
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={start}
              disabled={running || items.every((it) => it.status === "ok")}
              className="bg-brand hover:bg-red-700 disabled:opacity-40 text-white text-sm font-bold px-5 py-2.5 rounded-lg transition"
            >
              {running ? "Mengunggah..." : "Mulai Unggah"}
            </button>
            <button onClick={() => router.visit("/admin/gallery")} className="bg-white/10 hover:bg-white/20 text-white text-sm font-bold px-5 py-2.5 rounded-lg transition">
              Selesai
            </button>
          </div>
        </div>
      )}
    </div>
    </AdminLayout>
  );
}
