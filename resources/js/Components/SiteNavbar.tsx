import { usePage } from '@inertiajs/react';
import Navbar from './Navbar';

/**
 * Navbar global untuk semua halaman publik.
 * Tidak tampil di /admin*.
 */
export default function SiteNavbar() {
    const { url } = usePage();

    if (url?.startsWith('/admin')) return null;

    return (
        <div className="relative z-40 max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
            <Navbar />
        </div>
    );
}
