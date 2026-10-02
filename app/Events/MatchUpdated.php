<?php

namespace App\Events;

use App\Models\TournamentMatch;
use Illuminate\Broadcasting\Channel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;

class MatchUpdated implements ShouldBroadcastNow
{
    use Dispatchable;

    public function __construct(public TournamentMatch $match) {}

    public function broadcastOn(): Channel
    {
        return new Channel('scores');
    }

    public function broadcastAs(): string
    {
        return 'match.updated';
    }

    public function broadcastWith(): array
    {
        $m = $this->match->fresh()?->load(['team1:id,short_name,name,logo_path', 'team2:id,short_name,name,logo_path', 'team1Events', 'team2Events']);

        return ['match' => $m];
    }
}
