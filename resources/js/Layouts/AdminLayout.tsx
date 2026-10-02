import { Link, router, usePage } from '@inertiajs/react';
import { useEffect, useState, type ReactNode } from 'react';

const NAV = [
    { href: '/admin', label: 'Dashboard', icon: 'fa-solid fa-gauge-high' },
    { href: '/admin/live', label: 'Live Control', icon: 'fa-solid fa-tower-broadcast' },
    { href: '/admin/teams', label: 'Tim', icon: 'fa-solid fa-users' },
    { href: '/admin/players', label: 'Pemain', icon: 'fa-solid fa-user-group' },
    { href: '/admin/matches', label: 'Jadwal', icon: 'fa-regular fa-calendar-days' },
    { href: '/admin/bracket', label: 'Bracket', icon: 'fa-solid fa-diagram-project' },
    { href: '/admin/news', label: 'Berita', icon: 'fa-regular fa-newspaper' },
    { href: '/admin/gallery', label: 'Galeri', icon: 'fa-regular fa-images' },
    { href: '/admin/settings', label: 'Pengaturan', icon: 'fa-solid fa-gear' },
    { href: '/admin/users', label: 'Akun', icon: 'fa-solid fa-user-shield' },
];

type Crumb = { label: string; href?: string };

// Tinggi seragam header sidebar + topbar + drawer agar border-b menyambung rapi.
const BAR_H = 'h-16';

function breadcrumbs(url: string, detailLabel?: string): Crumb[] {
    const trail: Crumb[] = [{ label: 'Dashboard', href: '/admin' }];
    if (url === '/admin' || url === '/admin/') return [{ label: 'Dashboard' }];
    const push = (label: string, href?: string) => trail.push({ label, href });
    if (url.startsWith('/admin/live')) push('Live Control');
    else if (url.startsWith('/admin/teams')) push('Tim');
    else if (url.startsWith('/admin/players')) push('Pemain');
    else if (/^\/admin\/matches\/\d+/.test(url)) {
        push('Jadwal', '/admin/matches');
        push(detailLabel || 'Detail Laga');
    } else if (url.startsWith('/admin/matches')) push('Jadwal');
    else if (url.startsWith('/admin/bracket')) push('Bracket');
    else if (url.startsWith('/admin/news')) push('Berita');
    else if (url.startsWith('/admin/gallery/create')) {
      push('Galeri', '/admin/gallery');
      push('Tambah');
    } else if (/^\/admin\/gallery\/[^/]+$/.test(url)) {
      push('Galeri', '/admin/gallery');
      push('Detail Album');
    } else if (url.startsWith('/admin/gallery')) push('Galeri');
    else if (url.startsWith('/admin/settings')) push('Pengaturan');
    else if (url.startsWith('/admin/users')) push('Akun');
    else if (url.startsWith('/profile')) push('Profil & Password');
    else push(url);
    return trail;
}

export default function AdminLayout({ children }: { children: ReactNode }) {
    const { url, props } = usePage();
    const user = props.auth?.user as { name: string; email: string; role?: string } | null;
    const isPubdok = user?.role === 'pubdok';
    const nav = isPubdok ? NAV.filter((n) => n.href === '/admin/news' || n.href === '/admin/gallery') : NAV;

    const [collapsed, setCollapsed] = useState(() => {
        try {
            return localStorage.getItem('tsc-sidebar') === '1';
        } catch {
            return false;
        }
    });
    const [drawer, setDrawer] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);

    const toggleSidebar = () => {
        if (window.innerWidth < 768) {
            setDrawer(true);
            return;
        }
        setCollapsed((c) => {
            try {
                localStorage.setItem('tsc-sidebar', c ? '0' : '1');
            } catch {
                /* abaikan */
            }
            return !c;
        });
    };

    useEffect(() => {
        if (isPubdok && (url === '/admin' || url === '/admin/')) {
            router.visit('/admin/news');
        }
    }, [url, isPubdok]);

    useEffect(() => {
        setDrawer(false);
        setMenuOpen(false);
    }, [url]);

    useEffect(() => {
        const h = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setDrawer(false);
                setMenuOpen(false);
            }
        };
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, []);

    function logout() {
        router.post('/logout');
    }

    const match = (props as Record<string, unknown>).initialMatch as
        | { team1?: { short_name?: string; name?: string } | null; team2?: { short_name?: string; name?: string } | null }
        | undefined;
    const detailLabel =
        match && (match.team1 || match.team2)
            ? `${match.team1?.short_name || match.team1?.name || '?'} vs ${match.team2?.short_name || match.team2?.name || '?'}`
            : undefined;
    const crumbs = breadcrumbs(url.split('?')[0], detailLabel);

    const asideLink = (n: { href: string; label: string; icon: string }, mini: boolean) => {
        const active = url === n.href || (n.href !== '/admin' && url.startsWith(n.href + '/'));
        return (
            <Link
                key={n.href}
                href={n.href}
                title={n.label}
                onClick={() => setDrawer(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded transition text-sm ${
                    active ? 'bg-brand text-white' : 'text-muted hover:text-white hover:bg-white/5'
                } ${mini ? 'justify-center' : ''}`}
            >
                <i className={`${n.icon} w-4 text-center shrink-0`}></i>
                {!mini && <span className="truncate">{n.label}</span>}
            </Link>
        );
    };

    return (
        <div className="min-h-screen bg-dark text-white flex">
            {/* Sidebar desktop */}
            <aside
                className={`shrink-0 border-r border-border bg-surface/40 hidden md:flex flex-col transition-all duration-200 ${
                    collapsed ? 'w-16' : 'w-56'
                }`}
            >
                <div className={`flex items-center gap-2.5 px-4 ${BAR_H} shrink-0 border-b border-border ${collapsed ? 'justify-center px-0' : ''}`}>
                    <img src="/tsclogo.png" alt="TSC" className="w-9 h-9 rounded-lg object-cover shrink-0" />
                    {!collapsed && (
                        <div className="leading-tight">
                            <div className="font-display font-bold italic text-sm">TSC ADMIN</div>
                            <div className="text-brand text-[10px] font-bold tracking-widest">VOL V</div>
                        </div>
                    )}
                </div>
                <nav className="flex-1 p-3 flex flex-col gap-1">{nav.map((n) => asideLink(n, collapsed))}</nav>
            </aside>

            {/* Drawer mobile */}
            {drawer && (
                <div className="fixed inset-0 z-40 md:hidden">
                    <div className="absolute inset-0 bg-black/60" onClick={() => setDrawer(false)}></div>
                    <aside className="absolute left-0 top-0 bottom-0 w-64 bg-surface border-r border-border flex flex-col">
                        <div className={`flex items-center gap-2.5 px-4 ${BAR_H} shrink-0 border-b border-border`}>
                            <img src="/tsclogo.png" alt="TSC" className="w-9 h-9 rounded-lg object-cover" />
                            <div className="leading-tight flex-1">
                                <div className="font-display font-bold italic text-sm">TSC ADMIN</div>
                                <div className="text-brand text-[10px] font-bold tracking-widest">VOL V</div>
                            </div>
                            <button onClick={() => setDrawer(false)} className="text-muted hover:text-white px-2" aria-label="Tutup menu">
                                <i className="fa-solid fa-xmark"></i>
                            </button>
                        </div>
                        <nav className="flex-1 p-3 flex flex-col gap-1 overflow-y-auto">{nav.map((n) => asideLink(n, false))}</nav>
                    </aside>
                </div>
            )}

            <div className="flex-1 min-w-0 flex flex-col">
                {/* Topbar */}
                <header className="sticky top-0 z-30 bg-dark/90 backdrop-blur border-b border-border">
                    <div className={`flex items-center gap-2 px-3 sm:px-4 ${BAR_H}`}>
                        <button
                            onClick={toggleSidebar}
                            className="p-2 -ml-1 rounded-lg text-muted hover:text-white hover:bg-white/5 transition"
                            aria-label="Buka/tutup sidebar"
                            title="Buka/tutup sidebar"
                        >
                            <i className="fa-solid fa-bars"></i>
                        </button>
                        <nav className="flex items-center gap-1.5 text-[13px] min-w-0 overflow-hidden" aria-label="Breadcrumb">
                            {crumbs.map((c, i) => (
                                <span key={i} className="flex items-center gap-1.5 shrink-0">
                                    {i > 0 && <span className="text-muted/50">/</span>}
                                    {c.href && i < crumbs.length - 1 ? (
                                        <Link href={c.href} className="text-muted hover:text-white transition truncate">
                                            {c.label}
                                        </Link>
                                    ) : (
                                        <span className={i === crumbs.length - 1 ? 'text-white font-semibold truncate' : 'text-muted truncate'}>
                                            {c.label}
                                        </span>
                                    )}
                                </span>
                            ))}
                        </nav>
                        <div className="flex-1"></div>
                        <div className="relative shrink-0">
                            <button
                                onClick={() => setMenuOpen((o) => !o)}
                                className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-white/5 transition"
                                aria-label="Menu pengguna"
                            >
                                <span className="w-8 h-8 rounded-full bg-brand/20 text-brand flex items-center justify-center text-sm font-bold">
                                    {(user?.name || user?.email || '?').charAt(0).toUpperCase()}
                                </span>
                                <span className="hidden sm:block text-left leading-tight max-w-32">
                                    <span className="block text-[13px] font-semibold truncate">{user?.name}</span>
                                    <span className="block text-[11px] text-muted uppercase tracking-wide">{user?.role || ''}</span>
                                </span>
                                <i className="fa-solid fa-chevron-down text-[10px] text-muted"></i>
                            </button>
                            {menuOpen && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)}></div>
                                    <div className="absolute right-0 mt-2 w-60 z-50 bg-surface border border-border rounded-xl shadow-xl overflow-hidden">
                                        <div className="px-4 py-3 border-b border-border">
                                            <p className="text-sm font-semibold truncate">{user?.name}</p>
                                            <p className="text-xs text-muted truncate">{user?.email}</p>
                                            <span className="inline-block mt-1.5 text-[10px] font-bold uppercase tracking-widest bg-brand/15 text-brand px-2 py-0.5 rounded">
                                                {user?.role}
                                            </span>
                                        </div>
                                        <Link
                                            href="/profile"
                                            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-muted hover:text-white hover:bg-white/5 transition"
                                        >
                                            <i className="fa-solid fa-user-gear w-4 text-center"></i> Profil & Ganti Password
                                        </Link>
                                        <button
                                            onClick={logout}
                                            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-muted hover:text-white hover:bg-white/5 transition border-t border-border"
                                        >
                                            <i className="fa-solid fa-right-from-bracket w-4 text-center"></i> Keluar
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </header>
                <main className="p-4 sm:p-6 max-w-6xl w-full">{children}</main>
            </div>
        </div>
    );
}
