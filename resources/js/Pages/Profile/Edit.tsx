import AdminLayout from '@/Layouts/AdminLayout';
import { Head, useForm, usePage } from '@inertiajs/react';
import { type FormEventHandler } from 'react';

const input =
    'w-full bg-dark border border-border rounded px-3 py-2 text-sm text-white outline-none focus:border-brand';

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
    return (
        <div>
            <label className="block text-xs font-semibold text-muted mb-1">{label}</label>
            {children}
            {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
        </div>
    );
}

export default function Edit() {
    const user = usePage().props.auth?.user as { name: string; email: string } | undefined;

    const info = useForm({ name: user?.name || '', email: user?.email || '' });
    const pass = useForm({ current_password: '', password: '', password_confirmation: '' });

    const submitInfo: FormEventHandler = (e) => {
        e.preventDefault();
        info.patch(route('profile.update'), { preserveScroll: true });
    };

    const submitPassword: FormEventHandler = (e) => {
        e.preventDefault();
        pass.put(route('password.update'), {
            preserveScroll: true,
            onSuccess: () => pass.reset(),
            onError: (errors) => {
                if (errors.password) pass.reset('password', 'password_confirmation');
                if (errors.current_password) pass.reset('current_password');
            },
        });
    };

    return (
        <AdminLayout>
            <Head title="Profil & Password" />
            <h1 className="font-display italic font-bold text-2xl mb-1">Profil & Password</h1>
            <p className="text-sm text-muted mb-6">Kelola informasi akun dan kata sandi Anda.</p>

            {info.recentlySuccessful && (
                <p className="text-xs text-green-400 mb-4">Informasi akun tersimpan.</p>
            )}

            <div className="grid gap-4 max-w-2xl">
                <form onSubmit={submitInfo} className="bg-surface border border-border rounded-xl p-5 flex flex-col gap-3">
                    <h2 className="font-bold text-sm uppercase tracking-wide">Informasi Akun</h2>
                    <Field label="NAMA" error={info.errors.name}>
                        <input
                            className={input}
                            value={info.data.name}
                            onChange={(e) => info.setData('name', e.target.value)}
                            required
                        />
                    </Field>
                    <Field label="EMAIL" error={info.errors.email}>
                        <input
                            className={input}
                            type="email"
                            value={info.data.email}
                            onChange={(e) => info.setData('email', e.target.value)}
                            required
                        />
                    </Field>
                    <button
                        disabled={info.processing}
                        className="self-start bg-brand hover:bg-red-700 disabled:opacity-60 text-white text-sm font-bold px-5 py-2 rounded-lg transition"
                    >
                        {info.processing ? 'Menyimpan...' : 'Simpan'}
                    </button>
                </form>

                <form onSubmit={submitPassword} className="bg-surface border border-border rounded-xl p-5 flex flex-col gap-3">
                    <h2 className="font-bold text-sm uppercase tracking-wide">Ganti Password</h2>
                    <Field label="PASSWORD SAAT INI" error={pass.errors.current_password}>
                        <input
                            className={input}
                            type="password"
                            value={pass.data.current_password}
                            onChange={(e) => pass.setData('current_password', e.target.value)}
                            autoComplete="current-password"
                        />
                    </Field>
                    <Field label="PASSWORD BARU (MIN. 8 KARAKTER)" error={pass.errors.password}>
                        <input
                            className={input}
                            type="password"
                            value={pass.data.password}
                            onChange={(e) => pass.setData('password', e.target.value)}
                            autoComplete="new-password"
                        />
                    </Field>
                    <Field label="KONFIRMASI PASSWORD BARU">
                        <input
                            className={input}
                            type="password"
                            value={pass.data.password_confirmation}
                            onChange={(e) => pass.setData('password_confirmation', e.target.value)}
                            autoComplete="new-password"
                        />
                    </Field>
                    <button
                        disabled={pass.processing}
                        className="self-start bg-brand hover:bg-red-700 disabled:opacity-60 text-white text-sm font-bold px-5 py-2 rounded-lg transition"
                    >
                        {pass.processing ? 'Menyimpan...' : 'Ganti Password'}
                    </button>
                    {pass.recentlySuccessful && (
                        <p className="text-xs text-green-400">Password berhasil diganti.</p>
                    )}
                </form>
            </div>
        </AdminLayout>
    );
}
