<?php

namespace Database\Seeders;

use App\Models\TournamentMatch;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

/**
 * Skeleton knockout: 16 Besar -> 8 Besar -> Semifinal -> Final per kategori.
 * Semua slot TBD; pemenang otomatis mengisi laga lanjutan saat laga selesai.
 * Idempoten: lewati kategori yang slot bracket-nya sudah ada.
 */
class BracketSeeder extends Seeder
{
    public function run(): void
    {
        foreach (['SMA', 'SMP'] as $category) {
            $exists = TournamentMatch::where('category', $category)
                ->whereNotNull('slot')
                ->exists();

            if ($exists) {
                continue;
            }

            $base = Carbon::create(2026, 10, 5);
            $make = function (string $slot, string $label, int $order, int $dayOffset, string $kickoff, string $lapangan) use ($category, $base) {
                return TournamentMatch::create([
                    'category' => $category,
                    'stage' => $label,
                    'round_label' => $label,
                    'round_order' => $order,
                    'slot' => $slot,
                    'lapangan' => $lapangan,
                    'venue' => 'SMK Telkom Makassar',
                    'match_date' => $base->copy()->addDays($dayOffset)->toDateString(),
                    'kickoff' => $kickoff,
                    'team1_id' => null,
                    'team2_id' => null,
                    'status' => 'scheduled',
                ]);
            };

            // 16 Besar (8 laga)
            $r16 = [];
            for ($i = 1; $i <= 8; $i++) {
                $r16[$i] = $make("R16-$i", '16 Besar', 1, 0, $i % 2 ? '08:00' : '10:00', 'Lapangan '.(($i % 2) + 1));
            }

            // 8 Besar (4 laga)
            $qf = [];
            for ($i = 1; $i <= 4; $i++) {
                $qf[$i] = $make("QF-$i", '8 Besar', 2, 1, $i % 2 ? '08:00' : '10:00', 'Lapangan '.(($i % 2) + 1));
            }

            // Semifinal (2 laga)
            $sf = [];
            for ($i = 1; $i <= 2; $i++) {
                $sf[$i] = $make("SF-$i", 'Semifinal', 3, 2, $i === 1 ? '14:00' : '16:00', "Lapangan $i");
            }

            // Final
            $final = $make('F-1', 'Final', 4, 3, '15:00', 'Lapangan 1');

            // Tautan pemenang: ganjil -> slot team1, genap -> slot team2.
            $link = function (TournamentMatch $from, TournamentMatch $to) {
                $num = (int) substr($from->slot, strrpos($from->slot, '-') + 1);
                $from->update([
                    'winner_next_match_id' => $to->id,
                    'winner_next_side' => $num % 2 ? 'team1' : 'team2',
                ]);
            };

            for ($i = 1; $i <= 8; $i++) {
                $link($r16[$i], $qf[(int) ceil($i / 2)]);
            }
            for ($i = 1; $i <= 4; $i++) {
                $link($qf[$i], $sf[(int) ceil($i / 2)]);
            }
            for ($i = 1; $i <= 2; $i++) {
                $link($sf[$i], $final);
            }
            // SF-1 (ganjil) -> team1, SF-2 (genap) -> team2 final.
        }
    }
}
