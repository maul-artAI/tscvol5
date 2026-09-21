<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\TournamentMatch;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Str;

class MatchReportController extends Controller
{
    public function show(TournamentMatch $match)
    {
        $match->load(['team1', 'team2', 'events']);

        $types = ['goal', 'yellow_card', 'red_card', 'foul'];
        $summary = ['team1' => array_fill_keys($types, 0), 'team2' => array_fill_keys($types, 0)];

        foreach ($match->events as $e) {
            if (isset($summary[$e->team_side][$e->type])) {
                $summary[$e->team_side][$e->type]++;
            }
        }

        $events = $match->events->sortBy('minute')->values();

        $pdf = Pdf::loadView('reports.berita-acara', [
            'match' => $match,
            'events' => $events,
            'summary' => $summary,
            'typeLabels' => [
                'goal' => 'Gol',
                'yellow_card' => 'Kartu Kuning',
                'red_card' => 'Kartu Merah',
                'foul' => 'Pelanggaran',
            ],
            'statusLabel' => [
                'scheduled' => 'Terjadwal',
                'live' => 'Berlangsung',
                'finished' => 'Selesai',
            ][$match->status] ?? $match->status,
            'tanggal' => $match->match_date?->translatedFormat('d F Y') ?? '-',
            'printedAt' => now()->translatedFormat('d F Y H:i'),
            'logoPath' => public_path('tsclogo.png'),
            'stelkPath' => public_path('stelk.png'),
        ])->setPaper('a4', 'portrait');

        $t1 = Str::slug($match->team1->short_name ?? 'tim-1');
        $t2 = Str::slug($match->team2->short_name ?? 'tim-2');

        return $pdf->download("berita-acara-{$t1}-vs-{$t2}.pdf");
    }
}
