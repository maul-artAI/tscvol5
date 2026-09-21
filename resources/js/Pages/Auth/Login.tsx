import { Head, useForm } from '@inertiajs/react';
import { type FormEventHandler } from 'react';

export default function Login({ status }: { status?: string }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: 'admin@tsc.local',
        password: '',
        remember: false,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post('/login', {
            onFinish: () => reset('password'),
        });
    };

    return (
        <>
            <Head title="Masuk Admin" />
            <main className="min-h-screen bg-dark flex items-center justify-center px-4 text-white">
                <form onSubmit={submit} className="w-full max-w-sm bg-surface border border-border rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <img src="/tsclogo.png" alt="TSC" className="w-11 h-11 rounded-lg object-cover" />
                        <div className="leading-tight">
                            <div className="font-display font-bold text-lg italic">ADMIN PANEL</div>
                            <div className="text-brand text-[11px] font-bold tracking-widest">FUTSAL CUP VOL V</div>
                        </div>
                    </div>

                    {status && <p className="mb-4 text-xs text-green-400">{status}</p>}
                    {(errors.email || errors.password) && (
                        <p className="mb-4 text-xs bg-brand/15 border border-brand/40 text-red-300 rounded px-3 py-2">
                            {errors.email || errors.password}
                        </p>
                    )}

                    <label className="block text-xs font-semibold text-muted mb-1">EMAIL</label>
                    <input
                        type="email"
                        required
                        value={data.email}
                        onChange={(e) => setData('email', e.target.value)}
                        className="w-full mb-4 bg-dark border border-border rounded px-3 py-2.5 text-sm outline-none focus:border-brand"
                    />

                    <label className="block text-xs font-semibold text-muted mb-1">PASSWORD</label>
                    <input
                        type="password"
                        required
                        value={data.password}
                        onChange={(e) => setData('password', e.target.value)}
                        className="w-full mb-5 bg-dark border border-border rounded px-3 py-2.5 text-sm outline-none focus:border-brand"
                    />

                    <button
                        type="submit"
                        disabled={processing}
                        className="w-full bg-brand hover:bg-red-700 disabled:opacity-60 text-white rounded py-2.5 text-sm font-bold transition live-glow"
                    >
                        {processing ? 'MASUK...' : 'MASUK'}
                    </button>
                </form>
            </main>
        </>
    );
}
