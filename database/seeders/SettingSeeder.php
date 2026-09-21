<?php

namespace Database\Seeders;

use App\Models\Setting;
use Illuminate\Database\Seeder;

class SettingSeeder extends Seeder
{
    public function run(): void
    {
        $settings = [
            'hero_line_1' => 'TELKOM SCHOOL',
            'hero_line_2' => 'FUTSAL CUP VOL V',
            'hero_tagline' => 'Play, Respect, Grow Together',
            'hero_subtitle' => 'More than a game, same passion, brighter generation',
            'tournament_dates' => '26 SEP - 10 OCT 2026',
            'tournament_venue' => 'SMK Telkom Makassar',
            'tournament_categories' => 'SMA & SMP',
            'live_banner_text' => 'Dua Lapangan, Satu Semangat',
            'half_duration_minutes' => '20',
        ];

        foreach ($settings as $key => $value) {
            Setting::updateOrCreate(['key' => $key], ['value' => $value]);
        }
    }
}
