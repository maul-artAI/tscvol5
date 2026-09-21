import { Link, router, usePage } from '@inertiajs/react';
import { useEffect, type ReactNode } from 'react';

const NAV = [
    { href: '/admin', label: 'Dashboard', icon: 'fa-solid fa-gauge-high' },
    { href: '/admin/live', label: 'Live Control', icon: 'fa-solid fa-tower-broadcast' },
    { href: '/admin/teams', label: 'Tim', icon: 'fa-solid fa-users' },
    { href: '/admin/players', label: 'Pemain', icon: 'fa-solid fa-user-group' },
    { href: '/admin/matches', label: 'Jadwal', icon: 'fa-regular fa-calendar-days' },
    { href: '/admin/bracket', label: 'Bagan', icon: 'fa-solid fa-diagram-project' },
    { href: '/admin/news', label: 'Berita', icon: 'fa-regular fa-newspaper' },
    { href: '/admin/settings', label: 'Pengaturan', icon: 'fa-solid fa-gear' },
    { href: '/admin/users', label: 'Akun', icon: 'fa-solid fa-user-shield' },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
    const { url, props } = usePage();
    const user = props.auth?.user as { name: string; email: string; role?: string } | null;
    const isPubdok = user?.role === 'pubdok';
    const nav = isPubdok ? NAV.filter((n) => n.href === '/admin/news') : NAV;

    useEffect(() => {
        if (isPubdok && (url === '/admin' || url === '/admin/')) {
            router.visit('/admin/news');
        }
    }, [url, isPubdok]);

    function logout() {
        router.post('/logout');
    }

    return (
        <div className="min-h-screen bg-dark text-white flex">
            <aside className="w-56 shrink-0 border-r border-border bg-surface/40 hidden md:flex flex-col">
                <div className="flex items-center gap-2.5 px-4 py-5 border-b border-border">
                    <img src="/tsclogo.png" alt="TSC" className="w-9 h-9 rounded-lg object-cover" />
                    <div className="leading-tight">
                        <div className="font-display font-bold italic text-sm">TSC ADMIN</div>
                        <div className="text-brand text-[10px] font-bold tracking-widest">VOL V</div>
                    </div>
                </div>
                <nav className="flex-1 p-3 flex flex-col gap-1 text-sm">
                    {nav.map((n) => {
                        const active = url === n.href || (n.href !== '/admin' && url.startsWith(n.href + '/'));
                        return (
                            <Link
                                key={n.href}
                                href={n.href}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded transition ${
                                    active ? 'bg-brand text-white' : 'text-muted hover:text-white hover:bg-white/5'
                                }`}
                            >
                                <i className={`${n.icon} w-4 text-center`}></i> {n.label}
                            </Link>
                        );
                    })}
                </nav>
                <div className="p-3 border-t border-border">
                    <p className="text-xs text-muted truncate px-1 mb-2">{user?.email}</p>
                    <button
                        onClick={logout}
                        className="w-full text-left text-sm text-muted hover:text-white px-3 py-2 rounded hover:bg-white/5 transition"
                    >
                        <i className="fa-solid fa-right-from-bracket w-4 text-center mr-2"></i> Keluar
                    </button>
                </div>
            </aside>

            <div className="flex-1 min-w-0">
                <div className="md:hidden flex items-center gap-2 px-4 py-3 border-b border-border overflow-x-auto text-sm">
                    {nav.map((n) => (
                        <Link
                            key={n.href}
                            href={n.href}
                            className={`px-3 py-1.5 rounded whitespace-nowrap ${
                                url === n.href ? 'bg-brand text-white' : 'text-muted'
                            }`}
                        >
                            {n.label}
                        </Link>
                    ))}
                    <button onClick={logout} className="px-3 py-1.5 text-muted whitespace-nowrap">
                        Keluar
                    </button>
                </div>
                <main className="p-4 sm:p-6 max-w-6xl">{children}</main>
            </div>
        </div>
    );
}
