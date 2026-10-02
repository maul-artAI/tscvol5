<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MatchEvent extends Model
{
    use HasFactory;

    protected $fillable = [
        'match_id',
        'minute',
        'team_side',
        'type',
        'period',
        'player_name',
        'assist_name',
    ];

    protected function minuteLabel(): Attribute
    {
        return Attribute::get(fn () => $this->minute."'");
    }

    protected static function booted(): void
    {
        // Skor penalti mengikuti event eksekutor (sumber tunggal kebenaran):
        // +1 tiap shootout_goal dibuat, -1 tiap dihapus/diubah dari itu.
        static::created(fn (MatchEvent $e) => $e->nudgePenalty(1));
        static::deleted(fn (MatchEvent $e) => $e->nudgePenalty(-1));
        static::updated(function (MatchEvent $e) {
            $wasGoal = $e->getOriginal('type') === 'shootout_goal';
            $isGoal = $e->type === 'shootout_goal';
            $wasSide = $e->getOriginal('team_side');
            $isSide = $e->team_side;
            if ($wasGoal && (!$isGoal || $wasSide !== $isSide)) {
                $e->bumpPenalty($wasSide, -1);
            }
            if ($isGoal && (!$wasGoal || $wasSide !== $isSide)) {
                $e->bumpPenalty($isSide, 1);
            }
        });
    }

    private function nudgePenalty(int $delta): void
    {
        if ($this->type !== 'shootout_goal') {
            return;
        }
        $this->bumpPenalty($this->team_side, $delta);
    }

    private function bumpPenalty(string $side, int $delta): void
    {
        $match = TournamentMatch::find($this->match_id);
        if (! $match) {
            return;
        }
        $col = $side === 'team1' ? 'penalty1' : 'penalty2';
        $match->{$col} = max(0, (int) ($match->{$col} ?? 0) + $delta);
        $match->is_penalty = TournamentMatch::derivePenaltyFlag($match->penalty1, $match->penalty2, (bool) $match->is_penalty);
        $match->save();
    }

    public function match(): BelongsTo
    {
        return $this->belongsTo(TournamentMatch::class, 'match_id');
    }
}
