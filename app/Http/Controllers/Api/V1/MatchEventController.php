<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\MatchEvent;
use App\Models\TournamentMatch;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MatchEventController extends Controller
{
    public function store(Request $request, TournamentMatch $match): JsonResponse
    {
        $validated = $request->validate([
            'minute' => ['required', 'integer', 'min:0', 'max:120'],
            'team_side' => ['required', 'in:team1,team2'],
            'type' => ['required', 'in:goal,yellow_card,red_card,foul'],
            'player_name' => ['required', 'string', 'max:100'],
            'assist_name' => ['nullable', 'string', 'max:100'],
        ]);

        $event = $match->events()->create($validated);

        return response()->json(['message' => 'Event dicatat.', 'data' => $event->append('minute_label')], 201);
    }

    public function update(Request $request, MatchEvent $event): JsonResponse
    {
        $event->update($request->validate([
            'minute' => ['sometimes', 'integer', 'min:0', 'max:120'],
            'team_side' => ['sometimes', 'in:team1,team2'],
            'type' => ['sometimes', 'in:goal,yellow_card,red_card,foul'],
            'player_name' => ['sometimes', 'string', 'max:100'],
            'assist_name' => ['nullable', 'string', 'max:100'],
        ]));

        return response()->json(['message' => 'Event diperbarui.', 'data' => $event->append('minute_label')]);
    }

    public function destroy(MatchEvent $event): JsonResponse
    {
        $event->delete();

        return response()->json(['message' => 'Event dihapus.']);
    }
}
