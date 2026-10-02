import { useEffect, useState } from "react";
import { apiFetch, revalidateSite } from "../../lib/api";
import AdminLayout from "../../Layouts/AdminLayout";
import { useFeedback } from "../../Components/Feedback";

const LOGO_KEYS = [
  { key: "logo_tsc", label: "Logo TSC", fallback: "/tsclogo.png" },
  { key: "logo_smk", label: "Logo SMK Telkom", fallback: "/stelk.png" },
] as const;

const HERO_BG_DEFAULT =
  "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1470&auto=format&fit=crop";

const ACCEPT = ".jpg,.jpeg,.png,.webp,.svg";

function LogoCard({ k, label, fallback, current, maxMb, accept, onChanged }: {
  k: string; label: string; fallback: string; current?: string; maxMb?: number; accept?: string;
  onChanged: (settings: Record<string, string>) => void;
}) {
  const { toast } = useFeedback();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function pick(f: File | null) {
    if (!f) {
      setFile(null);
      return;
    }
    const limit = (maxMb ?? 2) * 1024 * 1024;
    if (f.size > limit) {
      toast.error(`Ukuran file maksimal ${maxMb ?? 2}MB.`);
      return;
    }
    setFile(f);
  }

  async function upload() {
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append(k, file);
      const res = await apiFetch<{ data: Record<string, string> }>("/settings", { method: "POST", body: fd });
      onChanged(res.data);
      setFile(null);
      revalidateSite(["/"]);
      toast.success(`${label} berhasil disimpan.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Gagal memproses ${label}.`);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append(`remove_${k}`, "1");
      const res = await apiFetch<{ data: Record<string, string> }>("/settings", { method: "POST", body: fd });
      onChanged(res.data);
      setFile(null);
      revalidateSite(["/"]);
      toast.success(`${label} dihapus, kembali ke default.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Gagal menghapus ${label}.`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-surface border border-border rounded-xl p-4">
      <h2 className="font-bold text-sm uppercase tracking-wide mb-3">{label}</h2>
      <div className="flex items-center gap-4">
        <img
          src={preview || current || fallback}
          alt={label}
          className="h-16 w-auto rounded-lg object-contain bg-white/95 p-1.5 shrink-0"
        />
        <div className="flex flex-col gap-2 text-xs text-muted">
          <span>PNG/JPG/WebP otomatis dikonversi ke .webp optimal. SVG dipertahankan. Maks {maxMb ?? 2}MB.</span>
          <label className="w-fit cursor-pointer bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition">
            {file ? "Ganti file..." : "Pilih file..."}
            <input type="file" accept={accept || ACCEPT} className="hidden" onChange={(e) => pick(e.target.files?.[0] || null)} />
          </label>
          {file && <span className="truncate max-w-56 text-white">{file.name}</span>}
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <button
          onClick={upload}
          disabled={!file || busy}
          className="bg-brand hover:bg-red-700 disabled:opacity-40 text-white text-xs font-bold px-4 py-2 rounded-lg transition"
        >
          {busy ? "Memproses..." : "Simpan Logo"}
        </button>
        {current && (
          <button
            onClick={remove}
            disabled={busy}
            className="bg-white/10 hover:bg-white/20 disabled:opacity-40 text-white text-xs font-bold px-4 py-2 rounded-lg transition"
          >
            Hapus
          </button>
        )}
      </div>
    </div>
  );
}

export default function AdminSettingsPage({ initialSettings }: { initialSettings?: Record<string, string> }) {
  const { toast } = useFeedback();
  const [settings, setSettings] = useState<Record<string, string>>(initialSettings ?? {});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialSettings !== undefined) return;
    apiFetch<{ data: Record<string, string> }>("/settings", { auth: false })
      .then((res) => setSettings(res.data))
      .catch(() => {});
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiFetch<{ data: Record<string, string> }>("/settings", {
        method: "PUT",
        body: { settings },
      });
      setSettings(res.data);
      revalidateSite(["/", "/tentang"]);
      toast.success("Pengaturan tersimpan.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan.");
    } finally {
      setLoading(false);
    }
  }

  const textEntries = Object.entries(settings).filter(
    ([key]) => key !== "logo_tsc" && key !== "logo_smk" && key !== "hero_bg"
  );

  return (
    <AdminLayout>
    <div>
      <h1 className="font-display italic font-bold text-2xl mb-1">Pengaturan Turnamen</h1>
      <p className="text-sm text-muted mb-6">Teks hero, tanggal, venue, dan logo yang tampil di situs.</p>

      <div className="grid sm:grid-cols-2 gap-4 max-w-2xl mb-4">
        {LOGO_KEYS.map((l) => (
          <LogoCard
            key={l.key}
            k={l.key}
            label={l.label}
            fallback={l.fallback}
            current={settings[l.key] || undefined}
            onChanged={setSettings}
          />
        ))}
      </div>

      <div className="max-w-2xl mb-4">
        <LogoCard
          k="hero_bg"
          label="Background Hero (Halaman Utama)"
          fallback={HERO_BG_DEFAULT}
          current={settings.hero_bg || undefined}
          maxMb={5}
          accept=".jpg,.jpeg,.png,.webp"
          onChanged={setSettings}
        />
      </div>

      <form onSubmit={submit} className="bg-surface border border-border rounded-xl p-4 grid gap-3 max-w-2xl">
        {textEntries.map(([key, value]) => (
          <div key={key}>
            <label className="block text-xs font-semibold text-muted mb-1 uppercase">{key.replaceAll("_", " ")}</label>
            <input
              value={value || ""}
              onChange={(e) => setSettings({ ...settings, [key]: e.target.value })}
              className="w-full bg-dark border border-border rounded px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </div>
        ))}
        <button disabled={loading} className="bg-brand hover:bg-red-700 disabled:opacity-60 text-white text-sm font-bold px-5 py-2 rounded transition w-fit">
          {loading ? "Menyimpan..." : "Simpan Pengaturan"}
        </button>
      </form>
    </div>
    </AdminLayout>
  );
}
