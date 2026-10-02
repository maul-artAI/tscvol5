import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'danger';
type ToastItem = { id: number; type: ToastType; message: string };
type ConfirmOpts = {
    title: string;
    detail?: string;
    warning?: string;
    confirmLabel?: string;
    cancelLabel?: string;
};

type FeedbackCtx = {
    toast: { success: (message: string) => void; error: (message: string) => void; danger: (message: string) => void };
    confirmDlg: (opts: ConfirmOpts) => Promise<boolean>;
};

const Ctx = createContext<FeedbackCtx | null>(null);

export function useFeedback(): FeedbackCtx {
    const ctx = useContext(Ctx);
    if (!ctx) throw new Error('useFeedback harus dipakai di dalam <FeedbackProvider>');
    return ctx;
}

const AUTO_DISMISS_MS = 3500;

export function FeedbackProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<ToastItem[]>([]);
    const [confirm, setConfirm] = useState<(ConfirmOpts & { resolve: (v: boolean) => void }) | null>(null);
    const idRef = useRef(0);

    const push = useCallback((type: ToastType, message: string) => {
        const id = ++idRef.current;
        setToasts((prev) => [...prev.slice(-3), { id, type, message }]);
        window.setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, AUTO_DISMISS_MS);
    }, []);

    const dismiss = useCallback((id: number) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const confirmDlg = useCallback((opts: ConfirmOpts) => {
        return new Promise<boolean>((resolve) => {
            setConfirm({ ...opts, resolve });
        });
    }, []);

    const closeConfirm = useCallback(
        (v: boolean) => {
            setConfirm((c) => {
                c?.resolve(v);
                return null;
            });
        },
        []
    );

    useEffect(() => {
        if (!confirm) return;
        const h = (e: KeyboardEvent) => {
            if (e.key === 'Escape') closeConfirm(false);
        };
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, [confirm, closeConfirm]);

    return (
        <Ctx.Provider value={{ toast: { success: (m) => push('success', m), error: (m) => push('error', m), danger: (m) => push('danger', m) }, confirmDlg }}>
            {children}

            {/* Toast: kanan atas, di bawah topbar (h-16) */}
            <div className="fixed top-20 right-4 z-[100] w-80 max-w-[calc(100vw-2rem)] flex flex-col gap-2" aria-live="polite">
                {toasts.map((t) => (
                    <div
                        key={t.id}
                        className={`flex items-start gap-2.5 bg-surface border border-border border-l-4 rounded-xl px-3.5 py-3 shadow-2xl ${
                            t.type === 'success' ? 'border-l-green-500' : 'border-l-red-500'
                        }`}
                    >
                        <i
                            className={`mt-0.5 text-base ${
                                t.type === 'success'
                                    ? 'fa-solid fa-circle-check text-green-400'
                                    : t.type === 'danger'
                                      ? 'fa-solid fa-trash-can text-red-400'
                                      : 'fa-solid fa-circle-exclamation text-red-400'
                            }`}
                        ></i>
                        <p className="flex-1 text-[13px] leading-snug text-white">{t.message}</p>
                        <button
                            onClick={() => dismiss(t.id)}
                            className="text-muted hover:text-white transition px-1"
                            aria-label="Tutup notifikasi"
                        >
                            <i className="fa-solid fa-xmark text-xs"></i>
                        </button>
                    </div>
                ))}
            </div>

            {/* Modal konfirmasi */}
            {confirm && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/70" onClick={() => closeConfirm(false)}></div>
                    <div className="relative w-full max-w-sm bg-surface border border-border rounded-2xl p-5 shadow-2xl">
                        <div className="w-11 h-11 rounded-full bg-red-500/15 text-red-400 flex items-center justify-center text-lg mb-3">
                            <i className="fa-solid fa-triangle-exclamation"></i>
                        </div>
                        <h3 className="font-bold text-white">{confirm.title}</h3>
                        {confirm.detail && <p className="text-sm text-muted mt-1.5">{confirm.detail}</p>}
                        <p className="text-xs text-red-400/90 mt-2">
                            {confirm.warning || 'Tindakan ini tidak bisa dibatalkan.'}
                        </p>
                        <div className="flex gap-2 mt-5">
                            <button
                                onClick={() => closeConfirm(false)}
                                className="flex-1 bg-white/10 hover:bg-white/20 text-white text-sm font-bold py-2.5 rounded-lg transition"
                            >
                                {confirm.cancelLabel || 'Batal'}
                            </button>
                            <button
                                onClick={() => closeConfirm(true)}
                                className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm font-bold py-2.5 rounded-lg transition"
                            >
                                {confirm.confirmLabel || 'Ya, Hapus'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Ctx.Provider>
    );
}
