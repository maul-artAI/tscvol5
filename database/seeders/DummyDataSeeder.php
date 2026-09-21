<?php

namespace Database\Seeders;

use App\Models\Player;
use App\Models\Team;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Storage;

/**
 * Beban data awal: maks 10 pemain per tim + logo placeholder inisial (SVG).
 * Idempoten: lewati tim yang sudah punya pemain / sudah punya logo.
 */
class DummyDataSeeder extends Seeder
{
    public function run(): void
    {
        $first = ['Ahmad', 'Rizky', 'Fikri', 'Ilham', 'Yoga', 'Dimas', 'Bagas', 'Reza', 'Alif', 'Bima', 'Raka', 'Farel', 'Farhan', 'Fadli', 'Andi', 'Budi', 'Cahya', 'Dedi', 'Eko', 'Fajar', 'Galih', 'Hadi', 'Irfan', 'Joko', 'Lukman', 'Nanda', 'Putra', 'Rangga', 'Wahyu', 'Yuda', 'Bayu', 'Doni', 'Egil', 'Fandi', 'Gilang', 'Hendra', 'Ikbal', 'Jaya', 'Krisna', 'Leo'];
        $last = ['Pratama', 'Saputra', 'Wijaya', 'Santoso', 'Nugroho', 'Ramadhan', 'Maulana', 'Hidayat', 'Kusuma', 'Prayoga', 'Setiawan', 'Gunawan', 'Firmansyah', 'Rahman', 'Hakim', 'Syahputra', 'Wibowo', 'Kurniawan', 'Laksmana', 'Alfarizi', 'Siregar', 'Nasution', 'Pangestu', 'Wicaksono', 'Saputra'];
        $positions = ['Kiper', 'Anchor', 'Ala', 'Ala', 'Pivot', 'Anchor', 'Ala', 'Pivot', 'Ala', 'Pivot'];

        $teams = Team::where('is_active', true)->orderBy('id')->get();
        $tIndex = 0;

        foreach ($teams as $team) {
            $existing = $team->players()->count();
            $haveNumbers = $team->players()->whereNotNull('jersey_number')->pluck('jersey_number')->all();
            for ($i = $existing; $i < 10; $i++) {
                $num = $i + 1;
                while (in_array($num, $haveNumbers)) {
                    $num++;
                }
                $haveNumbers[] = $num;
                $name = $first[($tIndex * 10 + $i) % count($first)].' '.$last[($tIndex * 10 + $i * 7) % count($last)];
                Player::create([
                    'team_id' => $team->id,
                    'name' => $name,
                    'jersey_number' => $num,
                    'position' => $positions[$i % count($positions)],
                    'is_active' => true,
                ]);
            }

            if (! $team->logo_path) {
                $path = "team-logos/seed-{$team->id}.svg";
                Storage::disk('public')->put($path, $this->logoSvg($team->short_name ?: $team->name));
                $team->update(['logo_path' => $path]);
            }

            $tIndex++;
        }
    }

    private function logoSvg(string $label): string
    {
        $label = trim(mb_strtoupper(mb_substr($label, 0, 10)));
        $size = mb_strlen($label) <= 3 ? 36 : (mb_strlen($label) <= 6 ? 26 : 19);
        $label = htmlspecialchars($label, ENT_QUOTES, 'UTF-8');

        return <<<SVG
        <svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
          <rect width="128" height="128" rx="24" fill="#171717"/>
          <rect x="5" y="5" width="118" height="118" rx="20" fill="none" stroke="#DC2626" stroke-width="3"/>
          <circle cx="64" cy="26" r="5" fill="#DC2626"/>
          <text x="64" y="80" font-family="Arial, Helvetica, sans-serif" font-size="{$size}" font-weight="bold" font-style="italic" fill="#ffffff" text-anchor="middle">{$label}</text>
        </svg>
        SVG;
    }
}
