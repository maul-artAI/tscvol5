<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TournamentMatch extends Model
{
    protected $table = 'matches';

    use HasFactory;

    protected $appends = ['clock_display', 'clock_ended'];

    protected $fillable = [
        'category',
        'stage',
        'lapangan',
        'venue',
        'match_date',
        'kickoff',
        'team1_id',
        'team2_id',
        'team1_score',
        'team2_score',
        'penalty1',
        'penalty2',
        'is_penalty',
        'is_walkover',
        'status',
        'period',
        'clock',
        'clock_seconds',
        'clock_running',
        'clock_updated_at',
        'round_label',
        'round_order',
        'slot',
        'winner_next_match_id',
        'winner_next_side',
    ];

    protected static function booted(): void
    {
        // Saat laga selesai, pemenang otomatis mengisi slot laga lanjutan.
        static::updated(function (TournamentMatch $match) {
            if ($match->wasChanged('status') && $match->status === 'finished') {
                $match->advanceWinner();
            }
        });
    }

    public function advanceWinner(): void
    {
        $winnerId = $this->resolveWinnerId();
        if (! $winnerId) {
            return; // Seri tanpa penalti: admin menentukan manual.
        }

        if (! $this->winner_next_match_id || ! $this->winner_next_side) {
            return;
        }

        $next = static::find($this->winner_next_match_id);
        if (! $next) {
            return;
        }

        $column = $this->winner_next_side === 'team1' ? 'team1_id' : 'team2_id';
        if (empty($next->{$column})) {
            $next->update([$column => $winnerId]);
        }
    }

    /** ID pemenang: skor waktu normal, atau adu penalti bila imbang. */
    public function resolveWinnerId(): ?int
    {
        if ($this->team1_score !== $this->team2_score) {
            return $this->team1_score > $this->team2_score ? $this->team1_id : $this->team2_id;
        }

        if ($this->penalty1 !== null && $this->penalty2 !== null && $this->penalty1 !== $this->penalty2) {
            return $this->penalty1 > $this->penalty2 ? $this->team1_id : $this->team2_id;
        }

        return null;
    }

    /**
     * Turunkan flag adu penalti: true bila kedua skor penalti terisi dan
     * berbeda; false bila keduanya dikosongkan. Selain itu pertahankan.
     */
    public static function derivePenaltyFlag($p1, $p2, bool $current): bool
    {
        if ($p1 !== null && $p2 !== null) {
            return $p1 != $p2;
        }
        if ($p1 === null && $p2 === null) {
            return false;
        }

        return $current;
    }

    public function winnerNextMatch(): BelongsTo
    {
        return $this->belongsTo(static::class, 'winner_next_match_id');
    }

    protected function casts(): array
    {
        return [
            'match_date' => 'date',
            'clock_running' => 'boolean',
            'clock_updated_at' => 'datetime',
        ];
    }

    protected static ?int $halfMinutesCache = null;

    public static function halfDurationMinutes(): int
    {
        if (static::$halfMinutesCache === null) {
            static::$halfMinutesCache = (int) (Setting::get('half_duration_minutes', '20') ?: 20);
        }

        return static::$halfMinutesCache;
    }

    /** Detik efektif: akumulasi + waktu berjalan, dibatasi durasi babak. */
    public function effectiveSeconds(): int
    {
        $seconds = (int) ($this->clock_seconds ?? 0);

        if ($this->clock_running && $this->clock_updated_at) {
            // Selisih timestamp mentah (bukan diffInSeconds) agar arah hitung
            // selalu maju, terlepas dari konvensi tanda Carbon.
            $elapsed = max(0, now()->timestamp - $this->clock_updated_at->timestamp);
            $seconds += $elapsed;
        }

        return min($seconds, static::halfDurationMinutes() * 60);
    }

    protected function clockDisplay(): Attribute
    {
        return Attribute::get(function () {
            $s = $this->effectiveSeconds();

            return sprintf('%02d:%02d', intdiv($s, 60), $s % 60);
        });
    }

    protected function clockEnded(): Attribute
    {
        return Attribute::get(fn () => $this->effectiveSeconds() >= static::halfDurationMinutes() * 60);
    }

    public function team1(): BelongsTo
    {
        return $this->belongsTo(Team::class, 'team1_id');
    }

    public function team2(): BelongsTo
    {
        return $this->belongsTo(Team::class, 'team2_id');
    }

    public function events(): HasMany
    {
        return $this->hasMany(MatchEvent::class, 'match_id')->orderBy('minute');
    }

    public function team1Events(): HasMany
    {
        return $this->hasMany(MatchEvent::class, 'match_id')
            ->where('team_side', 'team1')
            ->orderBy('minute');
    }

    public function team2Events(): HasMany
    {
        return $this->hasMany(MatchEvent::class, 'match_id')
            ->where('team_side', 'team2')
            ->orderBy('minute');
    }

    public function scopeLive($query)
    {
        return $query->where('status', 'live');
    }

    public function scopeScheduled($query)
    {
        return $query->where('status', 'scheduled');
    }

    public function scopeFinished($query)
    {
        return $query->where('status', 'finished');
    }
}
