<?php

namespace App\Services;

use App\Models\Team;
use App\Models\TournamentMatch;

class StandingsService
{
    /**
     * @return list<array{position:int,team:Team,played:int,won:int,drawn:int,lost:int,goals_for:int,goals_against:int,goal_difference:int,points:int}>
     */
    public static function rows(string $category, ?string $group = null): array
    {
        $teams = Team::query()
            ->where('category', $category)
            ->where('is_active', true)
            ->when($group, fn ($q) => $q->where('group_name', $group))
            ->orderBy('name')
            ->get();

        $teamIds = $teams->pluck('id');

        // Hanya laga fase grup (tanpa slot bracket) yang dihitung.
        $matches = TournamentMatch::finished()
            ->where('category', $category)
            ->whereNull('slot')
            ->whereIn('team1_id', $teamIds)
            ->whereIn('team2_id', $teamIds)
            ->get();

        $rows = $teams->map(function (Team $team) use ($matches) {
            $played = $matches->where(fn ($m) => $m->team1_id === $team->id || $m->team2_id === $team->id);

            $w = $d = $l = $gf = $ga = 0;

            foreach ($played as $m) {
                $isTeam1 = $m->team1_id === $team->id;
                $for = $isTeam1 ? $m->team1_score : $m->team2_score;
                $against = $isTeam1 ? $m->team2_score : $m->team1_score;
                $gf += $for;
                $ga += $against;

                if ($for > $against) {
                    $w++;
                } elseif ($for === $against) {
                    $d++;
                } else {
                    $l++;
                }
            }

            return [
                'team' => $team->append('logo_url'),
                'played' => $w + $d + $l,
                'won' => $w,
                'drawn' => $d,
                'lost' => $l,
                'goals_for' => $gf,
                'goals_against' => $ga,
                'goal_difference' => $gf - $ga,
                'points' => $w * 3 + $d,
            ];
        })->sort(function (array $a, array $b) {
            return [$b['points'], $b['goal_difference'], $b['goals_for'], $a['team']['name']]
                <=> [$a['points'], $a['goal_difference'], $a['goals_for'], $b['team']['name']];
        })->values();

        return $rows->map(fn (array $row, int $i) => ['position' => $i + 1] + $row)->all();
    }

    public static function unfinishedCount(string $category, ?string $group = null): int
    {
        $teamIds = Team::query()
            ->where('category', $category)
            ->where('is_active', true)
            ->when($group, fn ($q) => $q->where('group_name', $group))
            ->pluck('id');

        return TournamentMatch::where('category', $category)
            ->where('status', '!=', 'finished')
            ->whereNull('slot')
            ->where(function ($q) use ($teamIds) {
                $q->whereIn('team1_id', $teamIds)->orWhereIn('team2_id', $teamIds);
            })
            ->count();
    }
}
