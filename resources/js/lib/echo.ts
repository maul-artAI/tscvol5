import Echo from "laravel-echo";
import Pusher from "pusher-js";

declare global {
    interface Window {
        Pusher?: typeof Pusher;
        Echo?: Echo<"reverb">;
    }
}

let echo: Echo<"reverb"> | null = null;

/** Koneksi socket Reverb (lazy). Null bila kunci tidak dikonfigurasi. */
export function getEcho(): Echo<"reverb"> | null {
    if (echo) return echo;
    const key = import.meta.env.VITE_REVERB_APP_KEY as string | undefined;
    if (!key) return null;
    if (typeof window !== "undefined") {
        window.Pusher = Pusher;
    }
    echo = new Echo({
        broadcaster: "reverb",
        key,
        wsHost: window.location.hostname,
        wsPort: 443,
        wssPort: 443,
        forceTLS: true,
        enabledTransports: ["ws", "wss"],
        disableStats: true,
    });
    window.Echo = echo;
    return echo;
}

export type LiveMatch = {
    id: number;
    category?: string;
    stage?: string | null;
    status?: string;
    match_date?: string | null;
    kickoff?: string | null;
    lapangan?: string | null;
    team1_id?: number | null;
    team2_id?: number | null;
    team1_score?: number;
    team2_score?: number;
    period?: string | null;
    clock?: string | null;
    clock_display?: string | null;
    [k: string]: unknown;
};

/** Gabungkan update laga realtime ke dalam list (ganti per id). */
export function mergeMatch<T extends { id: number }>(list: T[], m: T): T[] {
    const i = list.findIndex((x) => x.id === m.id);
    if (i === -1) return list;
    const next = list.slice();
    next[i] = { ...next[i], ...m };
    return next;
}

/** Pantau status koneksi socket. Callback menerima true bila terhubung. */
export function onConnectionChange(cb: (connected: boolean) => void): () => void {
    const e = getEcho();
    if (!e) {
        cb(false);
        return () => {};
    }
    const conn = (e as unknown as { connector?: { pusher?: { connection?: unknown } } }).connector?.pusher
        ?.connection as
        | { state?: string; bind?: (ev: string, fn: (s?: { current?: string }) => void) => void; unbind?: (ev: string) => void }
        | undefined;
    if (!conn?.bind) {
        cb(true);
        return () => {};
    }
    const handler = (s?: { current?: string }) => {
        const cur = s?.current ?? conn.state;
        cb(cur === "connected");
    };
    handler();
    conn.bind("state_change", handler);
    return () => conn.unbind?.("state_change");
}
