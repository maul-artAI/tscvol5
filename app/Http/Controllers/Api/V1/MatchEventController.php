<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\MatchEvent;
use App\Models\TournamentMatch;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MatchEventController extends Controller
{
    /**
     * Kanonisasi nama ke roster tim (case-insensitive) agar ejaan seragam
     * ("agra" vs "agra Rahmat" tidak memecah top skor). Tanpa cocok → apa adanya.
     */
    private function canonicalName(TournamentMatch $match, string $side, ?string $name): ?string
    {
        if ($name === null || trim($name) === '') {
            return $name;
        }
        $teamId = $side === 'team1' ? $match->team1_id : $match->team2_id;
        if (! $teamId) {
            return $name;
        }
        $hit = \App\Models\Player::where('team_id', $teamId)
            ->get(['name'])
            ->first(fn ($p) => mb_strtolower(trim($p->name)) === mb_strtolower(trim($name)));
        if ($hit) {
            return $hit->name;
        }
        // Coba juga tanpa gelar/awalan umum? Tidak — kembalikan apa adanya.
        return $name;
    }
    public function store(Request $request, TournamentMatch $match): JsonResponse
    {
        $validated = $request->validate([
            'minute' => ['required', 'integer', 'min:0', 'max:120'],
            'period' => ['nullable', 'string', 'max:20'],
            'team_side' => ['required', 'in:team1,team2'],
            'type' => ['required', 'in:goal,yellow_card,red_card,foul,shootout_goal,shootout_miss,own_goal,wo_call'],
            'player_name' => ['required', 'string', 'max:100'],
            'assist_name' => ['nullable', 'string', 'max:100'],
        ]);

        $event = $match->events()->create(array_merge($validated, [
            'player_name' => $this->canonicalName($match, $validated['team_side'], $validated['player_name']),
            'assist_name' => isset($validated['assist_name'])
                ? $this->canonicalName($match, $validated['team_side'], $validated['assist_name'])
                : null,
        ]));
        \App\Events\MatchUpdated::dispatch($match);

        return response()->json(['message' => 'Event dicatat.', 'data' => $event->append('minute_label')], 201);
    }

    public function update(Request $request, MatchEvent $event): JsonResponse
    {
        $validated = $request->validate([
            'minute' => ['sometimes', 'integer', 'min:0', 'max:120'],
            'period' => ['nullable', 'string', 'max:20'],
            'team_side' => ['sometimes', 'in:team1,team2'],
            'type' => ['sometimes', 'in:goal,yellow_card,red_card,foul,shootout_goal,shootout_miss,own_goal,wo_call'],
            'player_name' => ['sometimes', 'string', 'max:100'],
            'assist_name' => ['nullable', 'string', 'max:100'],
        ]);
        $side = $validated['team_side'] ?? $event->team_side;
        if (array_key_exists('player_name', $validated)) {
            $validated['player_name'] = $this->canonicalName($event->match, $side, $validated['player_name']);
        }
        if (array_key_exists('assist_name', $validated)) {
            $validated['assist_name'] = $this->canonicalName($event->match, $side, $validated['assist_name']);
        }
        $event->update($validated);

        \App\Events\MatchUpdated::dispatch($event->match);

        return response()->json(['message' => 'Event diperbarui.', 'data' => $event->append('minute_label')]);
    }

    public function destroy(MatchEvent $event): JsonResponse
    {
        $match = $event->match;
        $event->delete();
        \App\Events\MatchUpdated::dispatch($match);

        return response()->json(['message' => 'Event dihapus.']);
    }
}
