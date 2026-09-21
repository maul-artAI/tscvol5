import { router } from '@inertiajs/react';

/** Tombol kembali ke halaman sebelumnya (fallback ke href bila dibuka langsung). */
export default function BackButton({ href, label }: { href: string; label: string }) {
    function go() {
        if (typeof window !== 'undefined' && window.history.length > 1) {
            window.history.back();
        } else {
            router.visit(href);
        }
    }

    return (
        <button onClick={go} className="text-xs text-muted hover:text-white transition">
            <i className="fa-solid fa-arrow-left mr-1"></i> {label}
        </button>
    );
}
