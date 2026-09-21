<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Team;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StatisticsController extends Controller
{
    public function top(Request $request): JsonResponse
    {
        $request->validate([
            'category' => ['required', 'in:SMA,SMP'],
            'limit' => ['sometimes', 'integer', 'min:1', 'max:50'],
        ]);

        $category = $request->query('category');
        $limit = $request->integer('limit', 10);

        $scorers = DB::table('match_events as e')
            ->join('matches as m', 'm.id', '=', 'e.match_id')
            ->where('e.type', 'goal')
            ->where('m.category', $category)
            ->selectRaw("e.player_name as name, CASE WHEN e.team_side = 'team1' THEN m.team1_id ELSE m.team2_id END as team_id, COUNT(*) as goals")
            ->groupBy('name', 'team_id')
            ->orderByDesc('goals')
            ->orderBy('name')
            ->limit($limit)
            ->get();

        $assists = DB::table('match_events as e')
            ->join('matches as m', 'm.id', '=', 'e.match_id')
            ->whereNotNull('e.assist_name')
            ->where('m.category', $category)
            ->selectRaw("e.assist_name as name, CASE WHEN e.team_side = 'team1' THEN m.team1_id ELSE m.team2_id END as team_id, COUNT(*) as assists")
            ->groupBy('name', 'team_id')
            ->orderByDesc('assists')
            ->orderBy('name')
            ->limit($limit)
            ->get();

        $teams = Team::whereIn('id', $scorers->pluck('team_id')->merge($assists->pluck('team_id'))->unique())
            ->get()
            ->keyBy('id');

        $key = fn ($name, $teamId) => mb_strtolower($name)."\0".$teamId;
        $goalMap = [];
        foreach ($scorers as $r) {
            $goalMap[$key($r->name, $r->team_id)] = (int) $r->goals;
        }
        $assistMap = [];
        foreach ($assists as $r) {
            $assistMap[$key($r->name, $r->team_id)] = (int) $r->assists;
        }

        $row = function ($name, $teamId) use ($teams, $goalMap, $assistMap, $key) {
            return [
                'name' => $name,
                'team' => isset($teams[$teamId]) ? $teams[$teamId]->append('logo_url') : null,
                'goals' => $goalMap[$key($name, $teamId)] ?? 0,
                'assists' => $assistMap[$key($name, $teamId)] ?? 0,
            ];
        };

        $scorerRows = $scorers
            ->map(fn ($r) => $row($r->name, $r->team_id))
            ->unique(fn ($r) => mb_strtolower($r['name'])."\0".$r['team']['id'])
            ->sort(fn ($a, $b) => [$b['goals'], $b['assists'], $a['name']] <=> [$a['goals'], $a['assists'], $b['name']])
            ->values();
        $assistRows = $assists
            ->map(fn ($r) => $row($r->name, $r->team_id))
            ->unique(fn ($r) => mb_strtolower($r['name'])."\0".$r['team']['id'])
            ->sort(fn ($a, $b) => [$b['assists'], $b['goals'], $a['name']] <=> [$a['assists'], $a['goals'], $b['name']])
            ->values();

        return response()->json([
            'data' => [
                'scorers' => $scorerRows,
                'assists' => $assistRows,
            ],
        ]);
    }
}
