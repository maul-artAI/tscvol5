import axios from 'axios';

type ApiOptions = {
    method?: string;
    body?: FormData | Record<string, unknown> | null;
    auth?: boolean;
};

/** Kompatibel dengan pemakaian lama. Auth via session cookie (same-origin). */
export async function apiFetch<T>(path: string, opts: ApiOptions = {}): Promise<T> {
    const isForm = opts.body instanceof FormData;
    try {
        const res = await axios({
            url: `/api/v1${path}`,
            method: opts.method || 'GET',
            data: opts.body ?? undefined,
            headers: isForm ? { Accept: 'application/json' } : { 'Content-Type': 'application/json', Accept: 'application/json' },
        });
        return res.data as T;
    } catch (err: unknown) {
        if (axios.isAxiosError(err)) {
            if (err.response?.status === 401 && !window.location.pathname.startsWith('/rahasiabosku')) {
                window.location.href = '/rahasiabosku';
            }
            const d = err.response?.data as { message?: string; errors?: Record<string, string[]> } | undefined;
            const msg =
                d?.message ||
                (d?.errors ? Object.values(d.errors).flat().join(' ') : null) ||
                `Request gagal (${err.response?.status || 'network'})`;
            throw new Error(msg);
        }
        throw err;
    }
}

/** Tidak lagi diperlukan (Inertia selalu fresh) — dipertahankan agar port verbatim. */
export async function revalidateSite(_paths: string[]): Promise<void> {
    return;
}

export type Team = {
    id: number;
    name: string;
    short_name?: string | null;
    category: 'SMA' | 'SMP';
    group_name?: string | null;
    description?: string | null;
    logo_path?: string | null;
    logo_url?: string | null;
    is_active: boolean;
    players_count?: number;
};

export type MatchEvent = {
    id: number;
    match_id: number;
    minute: number;
    minute_label?: string;
    period?: string | null;
    team_side: 'team1' | 'team2';
    type: 'goal' | 'yellow_card' | 'red_card' | 'foul' | 'shootout_goal' | 'shootout_miss' | 'own_goal' | 'wo_call';
    player_name: string;
    assist_name?: string | null;
};

export type TournamentMatch = {
    id: number;
    category: 'SMA' | 'SMP';
    stage?: string | null;
    lapangan?: string | null;
    venue?: string | null;
    match_date: string;
    kickoff?: string | null;
    team1_id?: number | null;
    team2_id?: number | null;
    team1_score: number;
    team2_score: number;
    penalty1?: number | null;
    penalty2?: number | null;
    is_penalty?: boolean;
    is_walkover?: boolean;
    status: 'scheduled' | 'live' | 'finished';
    period?: string | null;
    clock?: string | null;
    clock_seconds: number;
    clock_running: boolean;
    clock_display?: string;
    clock_ended?: boolean;
    round_label?: string | null;
    round_order: number;
    slot?: string | null;
    winner_next_match_id?: number | null;
    winner_next_side?: 'team1' | 'team2' | null;
    updated_at?: string;
    team1?: Team | null;
    team2?: Team | null;
    events?: MatchEvent[];
    team1_events?: MatchEvent[];
    team2_events?: MatchEvent[];
};

export type NewsItem = {
    id: number;
    title: string;
    slug: string;
    category: string;
    cover_path?: string | null;
    cover_url?: string | null;
    excerpt?: string | null;
    body?: string | null;
    is_published: boolean;
    published_at?: string | null;
};

export type StandingRow = {
    position: number;
    team: Team;
    played: number;
    won: number;
    drawn: number;
    lost: number;
    goals_for: number;
    goals_against: number;
    goal_difference: number;
    points: number;
};

export type SettingsMap = Record<string, string>;
