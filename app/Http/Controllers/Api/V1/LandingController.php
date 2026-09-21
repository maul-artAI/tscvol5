<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\TournamentMatch;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LandingController extends Controller
{
    /**
     * Satu request untuk seluruh landing (hemat karena PHP dev server
     * melayani request secara serial).
     */
    public function index(Request $request): JsonResponse
    {
        $newsLimit = max(1, min(12, $request->integer('news_limit', 3)));

        $settings = \App\Models\Setting::allAsArray();

        $live = TournamentMatch::live()
            ->with(['team1', 'team2', 'team1Events', 'team2Events'])
            ->orderBy('match_date')
            ->orderBy('kickoff')
            ->get();

        $matches = TournamentMatch::query()
            ->with(['team1', 'team2'])
            ->orderBy('match_date')
            ->orderBy('kickoff')
            ->get();

        $news = \App\Models\News::published()
            ->orderByDesc('published_at')
            ->orderByDesc('id')
            ->limit($newsLimit)
            ->get()
            ->append('cover_url');

        return response()->json([
            'data' => [
                'settings' => $settings,
                'live_matches' => $live,
                'matches' => $matches,
                'news' => $news,
            ],
        ]);
    }
}
