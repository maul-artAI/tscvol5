<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\TournamentMatch;
use Illuminate\Http\JsonResponse;

class MatchClockController extends Controller
{
    public function start(TournamentMatch $match): JsonResponse
    {
        if ($match->lapangan && TournamentMatch::live()
            ->where('lapangan', $match->lapangan)
            ->where('id', '!=', $match->id)
            ->exists()) {
            return response()->json([
                'message' => "{$match->lapangan} sedang dipakai laga live lain. Selesaikan dulu laga tersebut.",
            ], 422);
        }

        $match->update([
            'clock_running' => true,
            'clock_updated_at' => now(),
            'status' => 'live',
        ]);

        return response()->json([
            'message' => 'Timer berjalan.',
            'data' => $match->fresh()->load(['team1', 'team2', 'events']),
        ]);
    }

    public function pause(TournamentMatch $match): JsonResponse
    {
        $seconds = $match->effectiveSeconds();

        $match->update([
            'clock_seconds' => $seconds,
            'clock_running' => false,
            'clock_updated_at' => now(),
            'clock' => sprintf('%02d:%02d', intdiv($seconds, 60), $seconds % 60),
        ]);

        return response()->json([
            'message' => 'Timer berhenti.',
            'data' => $match->fresh()->load(['team1', 'team2', 'events']),
        ]);
    }

    public function reset(TournamentMatch $match): JsonResponse
    {
        $match->update([
            'clock_seconds' => 0,
            'clock_running' => false,
            'clock_updated_at' => now(),
            'clock' => '00:00',
        ]);

        return response()->json([
            'message' => 'Timer di-nol-kan.',
            'data' => $match->fresh()->load(['team1', 'team2', 'events']),
        ]);
    }
}
