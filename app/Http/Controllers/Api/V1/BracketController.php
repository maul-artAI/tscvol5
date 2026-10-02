<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\TournamentMatch;
use App\Services\StandingsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BracketController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'category' => ['required', 'in:SMA,SMP'],
        ]);

        $matches = TournamentMatch::query()
            ->where('category', $request->query('category'))
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
        }
        $third = null;
        $po = $matches->firstWhere('slot', 'PO-1');
        if ($po && $po->status === 'finished' && $po->resolveWinnerId()) {
            $third = $po->team1_id === $po->resolveWinnerId() ? $po->team1 : $po->team2;
            $third?->append('logo_url');
        }

        return response()->json([
            'data' => [
                'rounds' => $rounds,
                'champion' => $champion?->append('logo_url'),
                'third' => $third,
            ],
        ]);
    }

    /**
     * Tarik juara + runner-up tiap grup ke slot 16 Besar.
     * Pasangan baku: A1 vs B2, B1 vs A2, C1 vs D2, D1 vs C2, dst.
     * Hanya grup yang SEMUA laganya selesai yang mengisi slot;
     * sisi dari grup yang belum selesai dilewati + dilaporkan.
     * Slot yang sudah terisi manual tidak ditimpa.
     */
    public function seedFromGroups(Request $request): JsonResponse
    {
        $request->validate([
            'category' => ['required', 'in:SMA,SMP'],
        ]);
        $category = $request->input('category');

        $map = self::r16Sources();
        $filledSlots = 0;
        $skippedSlots = 0;
        $slotRows = 0;
        $incomplete = [];

        foreach ($map as $num => $sides) {
            $slot = TournamentMatch::where('category', $category)
                ->where('slot', "R16-$num")
                ->first();

            if (! $slot) {
                continue;
            }
            $slotRows++;

            foreach (['team1', 'team2'] as $side) {
                [$group, $pos] = $sides[$side];

                if (StandingsService::unfinishedCount($category, "Grup $group") > 0) {
                    $incomplete[] = "Grup $group";
                    continue;
                }

                $rows = StandingsService::rows($category, "Grup $group");
                $team = $rows[$pos - 1]['team'] ?? null;

                if (empty($slot->{"{$side}_id"}) && $team) {
                    $slot->{"{$side}_id"} = $team->id;
                    $slot->save();
                    $filledSlots++;
                } else {
                    $skippedSlots++;
                }
            }
        }

        $incomplete = array_values(array_unique($incomplete));

        if ($slotRows === 0) {
            return response()->json([
                'message' => "Skeleton bracket $category belum ada — pulihkan dulu lewat seeder bracket, baru Tarik.",
            ], 422);
        }

        return response()->json([
            'message' => "16 Besar terisi: $filledSlots slot diisi, $skippedSlots dilewati (sudah terisi).".
                ($incomplete ? ' Grup yang belum selesai dan dilewati: '.implode(', ', $incomplete).'. Selesaikan dulu laganya lalu tarik lagi.' : ''),
            'data' => ['filled' => $filledSlots, 'skipped' => $skippedSlots, 'incomplete_groups' => $incomplete],
        ]);
    }

    /**
     * @return array<int, array{team1: array{string, int}, team2: array{string, int}}>
     *   nomor slot => sisi => [huruf grup, posisi klasemen (1=juara, 2=runner-up)]
     */
    public static function r16Sources(): array
    {
        // Slot => sisi => [huruf grup, posisi klasemen (1=juara, 2=runner-up)].
        // R16-1..4: juara vs runner-up sepasang; R16-5..8: dibalik.
        return [
            1 => ['team1' => ['A', 1], 'team2' => ['B', 2]],
            2 => ['team1' => ['C', 1], 'team2' => ['D', 2]],
            3 => ['team1' => ['E', 1], 'team2' => ['F', 2]],
            4 => ['team1' => ['G', 1], 'team2' => ['H', 2]],
            5 => ['team1' => ['H', 1], 'team2' => ['G', 2]],
            6 => ['team1' => ['F', 1], 'team2' => ['E', 2]],
            7 => ['team1' => ['D', 1], 'team2' => ['C', 2]],
            8 => ['team1' => ['B', 1], 'team2' => ['A', 2]],
        ];
    }
}
