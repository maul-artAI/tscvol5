<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\News;
use App\Models\Setting;
use App\Models\Team;
use App\Models\TournamentMatch;
use App\Services\StandingsService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PublicPageController extends Controller
{
    public function landing(): Response
    {
        return Inertia::render('Public/Landing', [
            'settings' => Setting::allAsArray(),
            'liveMatches' => TournamentMatch::live()
                ->with(['team1', 'team2', 'team1Events', 'team2Events'])
                ->orderBy('match_date')->orderBy('kickoff')->get(),
            'schedule' => TournamentMatch::with(['team1', 'team2'])
                ->orderBy('match_date')->orderBy('kickoff')->get(),
            'news' => News::published()->orderByDesc('published_at')->orderByDesc('id')
                ->limit(3)->get()->append('cover_url'),
        ]);
    }

    public function jadwal(): Response
    {
        return Inertia::render('Public/Jadwal', [
            'matches' => TournamentMatch::with(['team1', 'team2'])
                ->orderBy('match_date')->orderBy('kickoff')->get(),
        ]);
    }

    public function klasemen(): Response
    {
        return Inertia::render('Public/Klasemen', [
            'tables' => $this->allTables(),
        ]);
    }

    public function tim(): Response
    {
        return Inertia::render('Public/Tim', [
            'teams' => Team::where('is_active', true)->orderBy('category')->orderBy('name')->get(),
        ]);
    }

    public function timShow(Team $team): Response
    {
        $team->load(['players' => fn ($q) => $q->where('is_active', true)]);
        $team->players->each->append('photo_url');

        $matches = TournamentMatch::with(['team1', 'team2'])
            ->where(fn ($q) => $q->where('team1_id', $team->id)->orWhere('team2_id', $team->id))
            ->orderBy('match_date')->orderBy('kickoff')->get();

        return Inertia::render('Public/TimShow', [
            'team' => $team->append('logo_url'),
            'matches' => $matches,
        ]);
    }

    public function berita(Request $request): Response
    {
        $news = News::published()
            ->orderByDesc('published_at')->orderByDesc('id')
            ->limit($request->integer('per_page', 24))
            ->get()->append('cover_url');

        return Inertia::render('Public/Berita', ['items' => $news]);
    }

    public function beritaShow(string $slug): Response
    {
        $item = News::published()->where('slug', $slug)->firstOrFail();

        return Inertia::render('Public/BeritaShow', ['item' => $item->append('cover_url')]);
    }

    public function galeri(): Response
    {
        return Inertia::render('Public/Galeri');
    }

    public function galeriShow(string $slug): Response
    {
        \App\Models\GalleryAlbum::where('slug', $slug)->firstOrFail();

        return Inertia::render('Public/GaleriShow', ['slug' => $slug]);
    }

    public function tentang(): Response
    {
        return Inertia::render('Public/Tentang', [
            'settings' => Setting::allAsArray(),
        ]);
    }

    public function bagan(): Response
    {
        $brackets = [];
        $tables = $this->allTables();
        foreach (['SMA', 'SMP'] as $cat) {
            $matches = TournamentMatch::where('category', $cat)
                ->where('round_order', '>', 0)
                ->with(['team1', 'team2'])
                ->orderBy('round_order')->orderBy('slot')->get();

            $rounds = $matches->groupBy(fn ($m) => $m->round_order.'.'.($m->round_label ?: 'Ronde'))
                ->map(fn ($group) => [
                    'order' => $group->first()->round_order,
                    'label' => $group->first()->round_label,
                    'matches' => $group->values(),
                ])->sortKeys()->values();

            $final = $matches->sortByDesc('round_order')->first();
            $champion = null;
            if ($final && $final->status === 'finished' && $final->team1_score !== $final->team2_score) {
                $champion = $final->team1_score > $final->team2_score ? $final->team1 : $final->team2;
            }

            $brackets[$cat] = ['rounds' => $rounds, 'champion' => $champion];
        }

        return Inertia::render('Public/Bagan', [
            'brackets' => $brackets,
            'tables' => $this->allTables(),
        ]);
    }

    public function statistik(): Response
    {
        $ctrl = app(\App\Http\Controllers\Api\V1\StatisticsController::class);
        $sma = $ctrl->top(Request::create('/x', 'GET', ['category' => 'SMA']))->getData(true);
        $smp = $ctrl->top(Request::create('/x', 'GET', ['category' => 'SMP']))->getData(true);

        return Inertia::render('Public/Statistik', [
            'initial' => $sma['data'],
            'initialSmp' => $smp['data'],
        ]);
    }

    public function pertandingan(TournamentMatch $match): Response
    {
        $match->load(['team1', 'team2', 'events']);

        return Inertia::render('Public/Pertandingan', ['match' => $match]);
    }

    /** @return array<string, array<string, array>> */
    private function allTables(): array
    {
        $out = [];
        foreach (['SMA', 'SMP'] as $cat) {
            foreach (['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'] as $g) {
                $out[$cat][$g] = StandingsService::rows($cat, "Grup $g");
            }
        }

        return $out;
    }
}
