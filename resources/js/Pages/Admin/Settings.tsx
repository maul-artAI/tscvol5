
import { useEffect, useState } from "react";
import { apiFetch, revalidateSite } from "../../lib/api";
import AdminLayout from "../../Layouts/AdminLayout";

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiFetch<{ data: Record<string, string> }>("/settings", { auth: false })
      .then((res) => setSettings(res.data))
      .catch(() => {});
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    try {
      const res = await apiFetch<{ data: Record<string, string> }>("/settings", {
        method: "PUT",
        body: { settings },
      });
      setSettings(res.data);
      revalidateSite(["/", "/tentang"]);
      setMsg("Pengaturan tersimpan.");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Gagal menyimpan.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AdminLayout>
    <div>
      <h1 className="font-display italic font-bold text-2xl mb-1">Pengaturan Turnamen</h1>
      <p className="text-sm text-muted mb-6">Teks hero, tanggal, dan venue yang tampil di dashboard.</p>

      {msg && <p className="mb-4 text-xs bg-white/5 border border-border rounded px-3 py-2">{msg}</p>}

      <form onSubmit={submit} className="bg-surface border border-border rounded-xl p-4 grid gap-3 max-w-2xl">
        {Object.entries(settings).map(([key, value]) => (
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