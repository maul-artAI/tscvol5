<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\TournamentMatch;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TournamentMatchController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $matches = TournamentMatch::query()
            ->with(['team1', 'team2'])
            ->when($request->boolean('with_events'), fn ($q) => $q->with('events'))
            ->when($request->query('category'), fn ($q, $v) => $q->where('category', $v))
            ->when($request->query('status'), fn ($q, $v) => $q->where('status', $v))
            ->when($request->query('date'), fn ($q, $v) => $q->whereDate('match_date', $v))
            ->when($request->query('team_id'), fn ($q, $v) => $q->where(fn ($qq) => $qq->where('team1_id', $v)->orWhere('team2_id', $v)))
            ->orderBy('match_date')
            ->orderBy('kickoff')
            ->get();

        return response()->json(['data' => $matches]);
    }

    public function live(): JsonResponse
    {
        $matches = TournamentMatch::live()
            ->with(['team1', 'team2', 'team1Events', 'team2Events'])
            ->orderBy('match_date')
            ->orderBy('kickoff')
            ->get();

        return response()->json(['data' => $matches]);
    }

    public function show(TournamentMatch $match): JsonResponse
    {
        return response()->json(['data' => $match->load(['team1', 'team2', 'events'])]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate($this->rules());

        $this->ensureLapanganFree($validated['lapangan'] ?? null, null, $validated['status'] ?? 'scheduled');

        $match = TournamentMatch::create($validated);
        \App\Events\MatchUpdated::dispatch($match);

        return response()->json(
            ['message' => 'Pertandingan dibuat.', 'data' => $match->load(['team1', 'team2'])],
            201
        );
    }

    public function update(Request $request, TournamentMatch $match): JsonResponse
    {
        $validated = $request->validate($this->rules(true));
        $validated['is_penalty'] = $this->resolveIsPenalty($validated, $match);

        $dupError = $this->rejectKnockoutDuplicate($validated, $match);
        if ($dupError) {
            return response()->json(['message' => $dupError], 422);
        }

        $this->ensureLapanganFree(
            $validated['lapangan'] ?? $match->lapangan,
            $match->id,
            $validated['status'] ?? $match->status
        );

        $match->update($validated);
        \App\Events\MatchUpdated::dispatch($match->fresh());

        return response()->json(
            ['message' => 'Pertandingan diperbarui.', 'data' => $match->load(['team1', 'team2', 'events'])]
        );
    }

    public function updateLive(Request $request, TournamentMatch $match): JsonResponse
    {
        $validated = $request->validate([
            'team1_score' => ['sometimes', 'integer', 'min:0', 'max:99'],
            'team2_score' => ['sometimes', 'integer', 'min:0', 'max:99'],
            'penalty1' => ['nullable', 'integer', 'min:0', 'max:99', 'different:penalty2'],
            'penalty2' => ['nullable', 'integer', 'min:0', 'max:99'],
            'status' => ['sometimes', 'in:scheduled,live,finished'],
            'is_walkover' => ['sometimes', 'boolean'],
            'period' => ['nullable', 'string', 'max:20'],
            'clock' => ['nullable', 'string', 'max:10'],
        ]);
        $validated['is_penalty'] = $this->resolveIsPenalty($validated, $match);

        // Koreksi manual "MM:SS" ikut menghentikan timer agar tidak berebut.
        if (array_key_exists('clock', $validated) && $validated['clock'] !== null) {
            if (preg_match('/^(\d+)(?::(\d{1,2}))?$/', trim($validated['clock']), $m)) {
                $validated['clock_seconds'] = ((int) $m[1]) * 60 + (int) ($m[2] ?? 0);
                $validated['clock_running'] = false;
                $validated['clock_updated_at'] = now();
            }
        }

        if (($validated['status'] ?? $match->status) === 'live') {
            $this->ensureLapanganFree($match->lapangan, $match->id, 'live');
        }

        $match->update($validated);
        \App\Events\MatchUpdated::dispatch($match->fresh());

        return response()->json(
            ['message' => 'Skor live diperbarui.', 'data' => $match->fresh()->load(['team1', 'team2', 'events'])]
        );
    }

    public function destroy(TournamentMatch $match): JsonResponse
    {
        $match->delete();

        return response()->json(['message' => 'Pertandingan dihapus.']);
    }

    private function ensureLapanganFree(?string $lapangan, ?int $ignoreId, string $status): void
    {
        if ($status !== 'live' || ! $lapangan) {
            return;
        }

        $occupied = TournamentMatch::live()
            ->where('lapangan', $lapangan)
            ->when($ignoreId, fn ($q) => $q->where('id', '!=', $ignoreId))
            ->exists();

        if ($occupied) {
            abort(response()->json([
                'message' => "{$lapangan} sedang dipakai laga live lain. Selesaikan dulu laga tersebut.",
            ], 422));
        }
    }

    /**
     * Tolak tim ganda dalam satu ronde gugur: satu tim hanya boleh muncul
     * sekali per round_order (sisi mana pun, laga mana pun).
     */
    private function rejectKnockoutDuplicate(array $validated, TournamentMatch $match): ?string
    {
        if ((int) ($match->round_order ?? 0) <= 0) {
            return null;
        }
        $sides = [];
        if (array_key_exists('team1_id', $validated) && $validated['team1_id']) {
            $sides[] = (int) $validated['team1_id'];
        }
        if (array_key_exists('team2_id', $validated) && $validated['team2_id']) {
            $sides[] = (int) $validated['team2_id'];
        }
        if (! $sides) {
            return null;
        }
        $dup = TournamentMatch::where('category', $match->category)
            ->where('round_order', $match->round_order)
            ->where('id', '!=', $match->id)
            ->where(function ($q) use ($sides) {
                $q->whereIn('team1_id', $sides)->orWhereIn('team2_id', $sides);
            })
            ->first(['id', 'slot', 'team1_id', 'team2_id']);
        if (! $dup) {
            return null;
        }
        $teamId = in_array($dup->team1_id, $sides) ? $dup->team1_id : $dup->team2_id;
        $name = \App\Models\Team::whereKey($teamId)->value('short_name')
            ?? \App\Models\Team::whereKey($teamId)->value('name')
            ?? "Tim #$teamId";

        return "$name sudah terpasang di slot {$dup->slot} pada babak ini — satu tim tidak boleh tampil dua kali.";
    }

    /**
     * Turunkan flag adu penalti: true bila kedua skor penalti terisi dan
     * berbeda; false bila keduanya dikosongkan. Selain itu pertahankan.
     */
    public static function derivePenaltyFlag($p1, $p2, bool $current): bool
    {
        if ($p1 !== null && $p2 !== null) {
            return $p1 !== $p2;
        }
        if ($p1 === null && $p2 === null) {
            return false;
        }

        return $current;
    }

    /**
     * Turunkan flag adu penalti: true bila kedua skor penalti terisi dan
     * berbeda; false bila keduanya dikosongkan. Selain itu pertahankan.
     */
    private function resolveIsPenalty(array $validated, TournamentMatch $match): bool
    {
        $p1 = array_key_exists('penalty1', $validated) ? $validated['penalty1'] : $match->penalty1;
        $p2 = array_key_exists('penalty2', $validated) ? $validated['penalty2'] : $match->penalty2;

        return static::derivePenaltyFlag($p1, $p2, (bool) $match->is_penalty);
    }

    private function rules(bool $sometimes = false): array
    {
        $req = $sometimes ? 'sometimes' : 'required';

        return [
            'category' => [$req, 'in:SMA,SMP'],
            'stage' => ['nullable', 'string', 'max:100'],
            'lapangan' => ['nullable', 'string', 'max:50'],
            'venue' => ['nullable', 'string', 'max:100'],
            'match_date' => [$req, 'date'],
            'kickoff' => ['nullable', 'date_format:H:i'],
            'team1_id' => [$req, 'nullable', 'exists:teams,id', 'different:team2_id'],
            'team2_id' => [$req, 'nullable', 'exists:teams,id'],
            'team1_score' => ['sometimes', 'integer', 'min:0', 'max:99'],
            'team2_score' => ['sometimes', 'integer', 'min:0', 'max:99'],
            'penalty1' => ['nullable', 'integer', 'min:0', 'max:99', 'different:penalty2'],
            'penalty2' => ['nullable', 'integer', 'min:0', 'max:99'],
            'status' => ['sometimes', 'in:scheduled,live,finished'],
            'is_walkover' => ['sometimes', 'boolean'],
            'period' => ['nullable', 'string', 'max:20'],
            'clock' => ['nullable', 'string', 'max:10'],
            'round_label' => ['nullable', 'string', 'max:50'],
            'round_order' => ['sometimes', 'integer', 'min:0', 'max:99'],
            'slot' => ['nullable', 'string', 'max:10'],
            'winner_next_match_id' => ['nullable', 'exists:matches,id'],
            'winner_next_side' => ['nullable', 'in:team1,team2'],
        ];
    }
}
