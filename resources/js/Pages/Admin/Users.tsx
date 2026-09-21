
import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";
import AdminLayout from "../../Layouts/AdminLayout";

type Account = { id: number; name: string; email: string; role: string; created_at?: string };

export default function AdminUsersPage() {
  const [users, setUsers] = useState<Account[]>([]);
  const [forbidden, setForbidden] = useState(false);
  const [drawer, setDrawer] = useState<null | { mode: "add" } | { mode: "edit"; user: Account }>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "operator" });
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const res = await apiFetch<{ data: Account[] }>("/users");
      setUsers(res.data);
    } catch (err) {
      if (err instanceof Error && /Hanya admin|403/.test(err.message)) setForbidden(true);
      else setMsg(err instanceof Error ? err.message : "Gagal memuat.");
    }
  }

  useEffect(() => {
    load().catch(() => {});
  }, []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawer(null);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  function openAdd() {
    setForm({ name: "", email: "", password: "", role: "operator" });
    setMsg("");
    setDrawer({ mode: "add" });
  }

  function openEdit(u: Account) {
    setForm({ name: u.name, email: u.email, password: "", role: u.role });
    setMsg("");
    setDrawer({ mode: "edit", user: u });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    try {
      const payload: Record<string, string> = {
        name: form.name.trim(),
        email: form.email.trim(),
        role: form.role,
      };
      if (form.password) payload.password = form.password;

      if (drawer?.mode === "edit") {
        await apiFetch(`/users/${drawer.user.id}`, { method: "PUT", body: payload });
        setMsg("Akun diperbarui.");
      } else {
        if (!form.password) throw new Error("Password wajib diisi (min. 8 karakter).");
        await apiFetch("/users", { method: "POST", body: payload });
        setMsg("Akun dibuat.");
      }
      setDrawer(null);
      await load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Gagal menyimpan.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(u: Account) {
    if (!confirm(`Hapus akun ${u.name} (${u.email})?`)) return;
    setMsg("");
    try {
      await apiFetch(`/users/${u.id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Gagal menghapus.");
    }
  }

  const input =
    "w-full bg-dark border border-border rounded px-3 py-2 text-sm outline-none focus:border-brand";

  if (forbidden) {
    return (
      <div>
        <h1 className="font-display italic font-bold text-2xl mb-1">Kelola Akun</h1>
        <p className="text-sm text-muted bg-surface border border-border rounded-xl p-6 text-center mt-4">
          Halaman ini khusus peran admin.
        </p>
      </div>
    );
  }

  return (
    <AdminLayout>
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <h1 className="font-display italic font-bold text-2xl">Kelola Akun</h1>
        <button
          onClick={openAdd}
          className="bg-brand hover:bg-red-700 text-white text-sm font-bold px-4 py-2 rounded-lg transition live-glow"
        >
          + Tambah Akun
        </button>
      </div>
      <p className="text-sm text-muted mb-5">
        Admin penuh, operator kelola pertandingan, pubdok hanya berita. Sesi 12 jam.
      </p>

      {msg && !drawer && <p className="mb-4 text-xs bg-white/5 border border-border rounded px-3 py-2">{msg}</p>}

      <div className="bg-surface border border-border rounded-xl overflow-x-auto">
        <table className="w-full text-sm min-w-[560px]">
          <thead>
            <tr className="text-left text-[11px] uppercase text-muted border-b border-border">
              <th className="p-3">Nama</th>
              <th className="p-3">Email</th>
              <th className="p-3">Peran</th>
              <th className="p-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="p-3 font-medium">{u.name}</td>
                <td className="p-3 text-muted">{u.email}</td>
                <td className="p-3">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${u.role === "admin" ? "bg-brand/15 text-brand" : "bg-white/10 text-gray-300"}`}>
                    {u.role}
                  </span>
                </td>
                <td className="p-3 text-right whitespace-nowrap">
                  <button onClick={() => openEdit(u)} className="text-xs text-muted hover:text-white mr-3">Ubah</button>
                  <button onClick={() => remove(u)} className="text-xs text-muted hover:text-brand">Hapus</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {drawer && (
        <div className="fixed inset-0 z-[100]">
          <div className="absolute inset-0 bg-black/60" onClick={() => setDrawer(null)} />
          <aside className="absolute right-0 top-0 h-full w-full max-w-md bg-surface border-l border-border p-5 overflow-y-auto">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-display italic font-bold text-xl">
                {drawer.mode === "add" ? "Tambah Akun" : "Ubah Akun"}
              </h2>
              <button onClick={() => setDrawer(null)} className="text-muted hover:text-white text-lg px-2" aria-label="Tutup">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <p className="text-xs text-muted mb-4">Esc untuk tutup. Kosongkan password bila tidak diubah.</p>

            {msg && <p className="mb-3 text-xs bg-white/5 border border-border rounded px-3 py-2">{msg}</p>}

            <form onSubmit={submit} className="grid gap-3">
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">NAMA *</label>
                <input autoFocus className={input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required maxLength={100} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">EMAIL *</label>
                <input className={input} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required maxLength={150} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">
                  PASSWORD {drawer.mode === "add" ? "*" : "(kosongkan bila tidak diubah)"}
                </label>
                <input
                  className={input}
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">PERAN *</label>
                <select className={input} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                    <option value="operator">Operator (kelola pertandingan)</option>
                    <option value="pubdok">Pubdok (hanya berita)</option>
                    <option value="admin">Admin (penuh)</option>
                </select>
              </div>
              <button disabled={saving} className="bg-brand hover:bg-red-700 disabled:opacity-60 text-white text-sm font-bold py-2.5 rounded-lg transition live-glow mt-1">
                {saving ? "Menyimpan..." : drawer.mode === "add" ? "Buat Akun" : "Simpan Perubahan"}
              </button>
            </form>
          </aside>
        </div>
      )}
    </div>
    </AdminLayout>
  );
}