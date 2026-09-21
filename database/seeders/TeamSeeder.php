<?php

namespace Database\Seeders;

use App\Models\Team;
use Illuminate\Database\Seeder;

class TeamSeeder extends Seeder
{
    public function run(): void
    {
        $groups = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

        foreach ($this->smaTeams() as $i => [$name, $short]) {
            Team::create([
                'name' => $name,
                'short_name' => $short,
                'category' => 'SMA',
                'group_name' => 'Grup '.$groups[intdiv($i, 4)],
                'is_active' => true,
            ]);
        }

        foreach ($this->smpTeams() as $i => [$name, $short]) {
            Team::create([
                'name' => $name,
                'short_name' => $short,
                'category' => 'SMP',
                'group_name' => 'Grup '.$groups[intdiv($i, 4)],
                'is_active' => true,
            ]);
        }
    }

    /** @return list<array{string, string}> */
    private function smaTeams(): array
    {
        $teams = [
            ['SMK Telkom Makassar', 'SKT'],
        ];
        for ($i = 1; $i <= 17; $i++) {
            $teams[] = ["SMA Negeri $i Makassar", "SMAN $i"];
        }
        for ($i = 1; $i <= 7; $i++) {
            $teams[] = ["SMK Negeri $i Makassar", "SMKN $i"];
        }
        $teams[] = ['SMA Kristen Rajawali', 'SKR'];
        $teams[] = ['SMA Katolik Cendrawasih', 'SKC'];
        $teams[] = ['SMA Muhammadiyah 1 Makassar', 'SMUH 1'];
        $teams[] = ['SMA Islam Athirah Makassar', 'ATHIRAH'];
        $teams[] = ['SMA Zion Makassar', 'ZION'];
        $teams[] = ['SMK YPLP PGRI 1 Makassar', 'PGRI 1'];
        $teams[] = ['SMA Frater Makassar', 'FRATER'];

        return $teams;
    }

    /** @return list<array{string, string}> */
    private function smpTeams(): array
    {
        $teams = [
            ['SMP Telkom Makassar', 'SPT'],
        ];
        for ($i = 1; $i <= 20; $i++) {
            $teams[] = ["SMP Negeri $i Makassar", "SMPN $i"];
        }
        $teams[] = ['MTs Negeri 1 Makassar', 'MTSN 1'];
        $teams[] = ['MTs Negeri 2 Makassar', 'MTSN 2'];
        $teams[] = ['SMP Kristen Rajawali', 'SKR'];
        $teams[] = ['SMP Katolik Cendrawasih', 'SKC'];
        $teams[] = ['SMP Muhammadiyah 3 Makassar', 'SMUH 3'];
        $teams[] = ['SMP Islam Athirah 2 Makassar', 'ATHIRAH 2'];
        $teams[] = ['SMP Zion Makassar', 'ZION'];
        $teams[] = ['SMP Frater Makassar', 'FRATER'];
        $teams[] = ['SMP YPLP PGRI Makassar', 'PGRI'];
        $teams[] = ['SMP Hang Tuah Makassar', 'HANG TUAH'];
        $teams[] = ['SMP Kartika XX-I Makassar', 'KARTIKA'];

        return $teams;
    }
}
