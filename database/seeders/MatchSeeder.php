<?php

namespace Database\Seeders;

use App\Models\Team;
use App\Models\TournamentMatch;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

/**
 * Fixture fase grup: round-robin per grup (6 laga × 8 grup × 2 kategori).
 */
class MatchSeeder extends Seeder
{
    public function run(): void
    {
        $kickoffs = ['08:00', '09:30', '13:00', '14:30'];
        $base = Carbon::create(2026, 9, 26);

        foreach (['SMA', 'SMP'] as $category) {
            foreach (range('A', 'H') as $gi => $group) {
                $teams = Team::where('category', $category)
                    ->where('group_name', "Grup $group")
                    ->orderBy('id')
                    ->get();

                if ($teams->count() !== 4) {
                    continue;
                }

                $pairs = [
                    [0, 1], [2, 3], [0, 2], [1, 3], [0, 3], [1, 2],
                ];

                foreach ($pairs as $pi => [$a, $b]) {
                    TournamentMatch::create([
                        'category' => $category,
                        'stage' => "Fase Grup • Grup $group",
                        'round_label' => null,
                        'round_order' => 0,
                        'lapangan' => 'Lapangan '.(($pi % 2) + 1),
                        'venue' => 'SMK Telkom Makassar',
                        'match_date' => $base->copy()->addDays($gi)->toDateString(),
                        'kickoff' => $kickoffs[$pi % count($kickoffs)],
                        'team1_id' => $teams[$a]->id,
                        'team2_id' => $teams[$b]->id,
                        'status' => 'scheduled',
                    ]);
                }
            }
        }
    }
}
