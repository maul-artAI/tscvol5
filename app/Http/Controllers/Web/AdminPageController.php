<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\News;
use App\Models\Setting;
use App\Models\Team;
use App\Models\TournamentMatch;
use App\Models\User;
use App\Services\StandingsService;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Halaman admin dirender dengan data awal server-side (props Inertia),
 * meniru pola siappomjen: 1 round-trip per navigasi, tanpa fetch susulan
 * saat mount. Fetch client tetap dipakai setelah mutasi (tambah/ubah/hapus)
 * dan untuk polling (Live, MatchDetail) serta ganti tab (Bracket).
 */
class AdminPageController extends Controller
{
    public function dashboard(): Response
    {
        $live = $this->liveMatches();
        $scheduled = TournamentMatch::where('status', 'scheduled')->count();
        $finished = TournamentMatch::where('status', 'finished')->count();

        return Inertia::render('Admin/Dashboard', [
            'stats' => [
                'teams' => Team::count(),
                'live' => $live->count(),
                'scheduled' => $scheduled,
                'finished' => $finished,
                'news' => News::count(),
            ],
            'initialLive' => $live->values(),
            'initialTopTeams' => $this->topTeams(),
            'initialLoad' => $this->loadByDate(),
            'initialHeat' => $this->heatMatches(),
        ]);
    }

    public function live(): Response
    {
        return Inertia::render('Admin/Live', [
            'initialLive' => $this->liveMatches()->values(),
            'initialScheduled' => $this->scheduledMatches()->values(),
        ]);
    }

    public function matches(): Response
    {
        return Inertia::render('Admin/Matches', [
            'initialMatches' => $this->allMatches()->values(),
            'initialTeams' => $this->teamsList(),
        ]);
    }

    public function matchShow(int $match): Response
    {
        $item = TournamentMatch::with(['team1', 'team2', 'events'])->find($match);

        return Inertia::render('Admin/MatchDetail', [
            'id' => $match,
            'initialMatch' => $item,
            'initialSquad' => [
                'team1' => $this->squadFor($item?->team1_id),
                'team2' => $this->squadFor($item?->team2_id),
            ],
        ]);
    }

    public function teams(): Response
    {
        return Inertia::render('Admin/Teams', [
            'initialTeams' => $this->teamsList(),
        ]);
    }

    public function players(): Response
    {
        $teams = $this->teamsList();

        // Tim default = tim SMA pertama tanpa grup (cermin logika frontend).
        $default = Team::where('category', 'SMA')
            ->where(fn ($q) => $q->whereNull('group_name')->orWhere('group_name', ''))
            ->orderBy('name')
            ->first();

        return Inertia::render('Admin/Players', [
            'initialTeams' => $teams,
            'initialTeamId' => $default ? (string) $default->id : '',
            'initialPlayers' => $this->teamPlayers($default?->id),
        ]);
    }

    public function news(): Response
    {
        return Inertia::render('Admin/News', [
            'initialNews' => $this->newsItems(),
        ]);
    }

    public function newsCreate(): Response
    {
        return Inertia::render('Admin/NewsForm', ['item' => null]);
    }

    public function gallery(): Response
    {
        return Inertia::render('Admin/Gallery', [
            'initialPhotos' => \App\Models\GalleryPhoto::orderBy('album')->orderBy('sort_order')->orderByDesc('id')->get()->append('photo_url')->values(),
            'initialAlbums' => \App\Models\GalleryPhoto::select('album')->distinct()->orderBy('album')->pluck('album')->values(),
        ]);
    }

    public function galleryCreate(): Response
    {
        return Inertia::render('Admin/GalleryForm');
    }

    public function galleryShow(string $slug): Response
    {
        $album = \App\Models\GalleryAlbum::where('slug', $slug)->firstOrFail();

        return Inertia::render('Admin/GalleryDetail', [
            'album' => [
                'id' => $album->id,
                'title' => $album->title,
                'slug' => $album->slug,
            ],
            'initialPhotos' => $album->photos()->orderBy('sort_order')->orderBy('id')->get()->append('photo_url')->values(),
        ]);
    }
    public function newsEdit(News $news): Response
    {
        return Inertia::render('Admin/NewsForm', ['item' => $news->append('cover_url')]);
    }

    public function bracket(): Response
    {
        return Inertia::render('Admin/Bracket', [
            'initialCategory' => 'SMA',
            'initialBracket' => $this->bracketData('SMA'),
            'initialBracketTeams' => $this->teamsList('SMA'),
            'initialStandings' => StandingsService::rows('SMA'),
        ]);
    }

    public function settings(): Response
    {
        return Inertia::render('Admin/Settings', [
            'initialSettings' => Setting::allAsArray(),
        ]);
    }

    public function users(): Response
    {
        return Inertia::render('Admin/Users', [
            'initialUsers' => User::orderBy('name')->get(['id', 'name', 'email', 'role', 'created_at']),
        ]);
    }

    /** 5 tim terproduktif (gol) lintas kategori. */
    private function topTeams(): array
    {
        $rows = \DB::table('match_events as e')
            ->join('matches as m', 'm.id', '=', 'e.match_id')
            ->where('e.type', 'goal')
            ->selectRaw("CASE WHEN e.team_side = 'team1' THEN m.team1_id ELSE m.team2_id END as team_id, COUNT(*) as goals")
            ->groupBy('team_id')
            ->orderByDesc('goals')
            ->limit(5)
            ->get();

        $teams = Team::whereIn('id', $rows->pluck('team_id'))->get()->keyBy('id');

        return $rows->map(fn ($r) => [
            'name' => $teams->get($r->team_id)?->short_name ?: $teams->get($r->team_id)?->name ?: 'TBD',
            'category' => $teams->get($r->team_id)?->category,
            'goals' => (int) $r->goals,
        ])->values()->all();
    }

    /** Beban laga per tanggal per lapangan (kolom ringan untuk timeline). */
    private function loadByDate(): array
    {
        return TournamentMatch::query()
            ->select(['match_date', 'lapangan', 'status'])
            ->whereNotNull('match_date')
            ->orderBy('match_date')
            ->get()
            ->groupBy(fn ($m) => substr((string) $m->match_date, 0, 10))
            ->map(fn ($g, $date) => [
                'date' => $date,
                'lapangan1' => $g->where('lapangan', 'Lapangan 1')->count(),
                'lapangan2' => $g->where('lapangan', 'Lapangan 2')->count(),
            ])
            ->values()
            ->all();
    }
    /** Laga ringkas untuk heatmap linimasa (id, tanggal, jam, lapangan, tim). */
    private function heatMatches(): array
    {
        return TournamentMatch::with(['team1:id,short_name,name', 'team2:id,short_name,name'])
            ->orderBy('match_date')
            ->orderBy('kickoff')
            ->get(['id', 'match_date', 'kickoff', 'lapangan', 'team1_id', 'team2_id'])
            ->map(fn ($m) => [
                'id' => $m->id,
                'date' => substr((string) $m->match_date, 0, 10),
                'time' => $m->kickoff ? substr((string) $m->kickoff, 0, 5) : null,
                'court' => $m->lapangan,
                'team1' => $m->team1?->short_name ?: $m->team1?->name,
                'team2' => $m->team2?->short_name ?: $m->team2?->name,
            ])
            ->values()
            ->all();
    }

    private function teamsList(?string $category = null)
    {
        return Team::query()
            ->when($category, fn ($q, $v) => $q->where('category', $v))
            ->withCount('players')
            ->orderBy('category')
            ->orderBy('name')
            ->get()
            ->append('logo_url')
            ->values();
    }

    private function liveMatches()
    {
        return TournamentMatch::live()
            ->with(['team1', 'team2', 'team1Events', 'team2Events'])
            ->orderBy('match_date')
            ->orderBy('kickoff')
            ->get();
    }

    private function scheduledMatches()
    {
        return TournamentMatch::where('status', 'scheduled')
            ->with(['team1', 'team2'])
            ->orderBy('match_date')
            ->orderBy('kickoff')
            ->get();
    }

    private function allMatches()
    {
        return TournamentMatch::with(['team1', 'team2'])
            ->orderBy('match_date')
            ->orderBy('kickoff')
            ->get();
    }

    /** Pemain satu tim (semua status) = replika GET /teams/{id}/players?active_only=0. */
    private function teamPlayers(?int $teamId)
    {
        if (! $teamId) {
            return [];
        }

        return Team::find($teamId)?->players()->get()->append('photo_url')->values() ?? [];
    }

    /** Skuad aktif untuk dropdown MatchDetail = replika GET /teams/{id}/players. */
    private function squadFor(?int $teamId)
    {
        if (! $teamId) {
            return [];
        }

        return Team::find($teamId)?->players()->where('is_active', true)->get()->values() ?? [];
    }

    /** Berita terbit (50 pertama) = replika GET /news?per_page=50. */
    private function newsItems()
    {
        $page = News::published()
            ->orderByDesc('published_at')
            ->orderByDesc('id')
            ->paginate(50);

        $page->getCollection()->each->append('cover_url');

        return $page->items();
    }

    /** Bracket satu kategori = replika GET /bracket?category=. */
    private function bracketData(string $category): array
    {
        $matches = TournamentMatch::query()
            ->where('category', $category)
            ->where('round_order', '>', 0)
            ->with(['team1', 'team2'])
            ->orderBy('round_order')
            ->orderBy('slot')
            ->get();

        $rounds = $matches
            ->groupBy(fn (TournamentMatch $m) => $m->round_order.'.'.($m->round_label ?: 'Ronde'))
            ->map(fn ($group) => [
                'order' => $group->first()->round_order,
                'label' => $group->first()->round_label,
                'matches' => $group->values(),
            ])
            ->sortKeys()
            ->values();

        $champion = null;
        $final = $matches->sortByDesc('round_order')->first();
        if ($final && $final->status === 'finished' && $final->resolveWinnerId()) {
            $champion = $final->team1_id === $final->resolveWinnerId() ? $final->team1 : $final->team2;
            $champion?->append('logo_url');
        }

        return ['rounds' => $rounds, 'champion' => $champion];
    }
}
