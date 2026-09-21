import { usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import Navbar from './Navbar';
import { apiFetch, type StandingRow, type TournamentMatch } from '../lib/api';

/**
 * Navbar global untuk semua halaman publik.
 * Tidak tampil di /admin*. Data mega menu di-fetch sekali per kunjungan.
 */
export default function SiteNavbar() {
    const { url } = usePage();
    const [schedule, setSchedule] = useState<TournamentMatch[]>([]);
    const [standings, setStandings] = useState<StandingRow[]>([]);

    useEffect(() => {
        if (url?.startsWith('/admin')) return;
        apiFetch<{ data: TournamentMatch[] }>('/matches', { auth: false })
            .then((res) => setSchedule(res.data))
            .catch(() => {});
        apiFetch<{ data: StandingRow[] }>('/standings?category=SMA', { auth: false })
            .then((res) => setStandings(res.data))
            .catch(() => {});
    }, [url]);

    if (url?.startsWith('/admin')) return null;

    return (
        <div className="relative z-40 max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
            <Navbar schedule={schedule} standings={standings} />
        </div>
    );
}
