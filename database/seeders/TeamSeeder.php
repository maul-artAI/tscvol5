<?php

namespace Database\Seeders;

use App\Models\Team;
use Illuminate\Database\Seeder;

/**
 * Data tim resmi TSC Vol V (32 SMA + 32 SMP).
 * Idempoten: aman dijalankan ulang (cocok via nama).
 * Grup awal A–H berurutan; ubah lewat UI drawing bila perlu.
 */
class TeamSeeder extends Seeder
{
    public function run(): void
    {
        foreach ($this->smaTeams() as [$name]) {
            Team::updateOrCreate(
                ['name' => $name, 'category' => 'SMA'],
                [
                    'short_name' => null,
                    'group_name' => null,
                    'is_active' => true,
                ]
            );
        }

        foreach ($this->smpTeams() as [$name]) {
            Team::updateOrCreate(
                ['name' => $name, 'category' => 'SMP'],
                [
                    'short_name' => null,
                    'group_name' => null,
                    'is_active' => true,
                ]
            );
        }
    }

    /** @return list<array{string, string}> */
    private function smaTeams(): array
    {
        return [
            ['SMA 16 Makassar A', 'SMA16-A'],
            ['SMA 16 Makassar B', 'SMA16-B'],
            ['SMAN 1 Makassar', 'SMAN1'],
            ['SMAN 11 Makassar A', 'SMAN11-A'],
            ['SMAN 11 Makassar B', 'SMAN11-B'],
            ['SMAN 11 Makassar C', 'SMAN11-C'],
            ['SMA 10 Makassar A', 'SMA10-A'],
            ['SMA 10 Makassar B', 'SMA10-B'],
            ['SMAN 11 Pangkep', 'SMAN11-P'],
            ['SMKN 2 Makassar A', 'SMKN2-A'],
            ['SMKN 2 Makassar B', 'SMKN2-B'],
            ['SMA 3 Makassar A', 'SMA3-A'],
            ['SMA 3 Makassar B', 'SMA3-B'],
            ['SMK 10 Makassar A', 'SMK10-A'],
            ['SMK 10 Makassar B', 'SMK10-B'],
            ['SMA Islam Al Akhyar', 'AKHYAR'],
            ['SMK 4 Makassar', 'SMK4'],
            ['SMK-SMTI Makassar', 'SMTI'],
            ['SMA Athirah Baruga', 'ATHIRAH'],
            ['SMA Makassar Mulya', 'MULYA'],
            ['PPTQ Patawali', 'PATAWALI'],
            ['SMAN 2 Gowa', 'SMAN2-G'],
            ['SMAN 12 Makassar A', 'SMAN12-A'],
            ['SMAN 12 Makassar B', 'SMAN12-B'],
            ['SMAN 9 Makassar', 'SMAN9'],
            ['SMAN 2 Makassar', 'SMAN2'],
            ['SMK Telkom Makassar', 'SKT'],
            ['SMAIT Al-Fityan School Gowa', 'AL-FITYAN'],
            ['SMAN 4 Makassar', 'SMAN4'],
            ['MAN 2 Makassar', 'MAN2'],
            ['SMAIT Al Qalam Gowa Boarding School', 'AL-QALAM'],
            ['SMAIT Darul Fikri Makassar', 'DARFIKRI'],
        ];
    }

    /** @return list<array{string, string}> */
    private function smpTeams(): array
    {
        return [
            ['SMP 2 Makassar A', 'SMP2-A'],
            ['SMP 2 Makassar B', 'SMP2-B'],
            ['SPENSAS', 'SPENSAS'],
            ['SMP IT At-Tauhid', 'AT-TAUHID'],
            ['PPTQ Patawali A', 'PATAWALI-A'],
            ['SMP 20 Makassar', 'SMP20'],
            ['SMP IT Al-Fatih', 'AL-FATIH'],
            ['SMP 22 Makassar', 'SMP22'],
            ['SMP 19 Makassar', 'SMP19'],
            ['SMP 3 Makassar', 'SMP3'],
            ['SMP 26 Makassar', 'SMP26'],
            ['SMP Telkom A', 'TELKOM-A'],
            ['SMP Telkom B', 'TELKOM-B'],
            ['SMP Telkom C', 'TELKOM-C'],
            ['SMPN 27 Makassar A', 'SMPN27-A'],
            ['SMP 4 Sungguminasa', 'SMP4-S'],
            ['SMP 24 Makassar A', 'SMP24-A'],
            ['SMP 24 Makassar B', 'SMP24-B'],
            ['SMP 10 Makassar', 'SMP10'],
            ['SMP 35 Makassar', 'SMP35'],
            ['SMP 5 Makassar', 'SMP5'],
            ['SMP 7 Makassar', 'SMP7'],
            ['SMPN 36 Makassar', 'SMPN36'],
            ['SMP Al-Wildan 22', 'AL-WILDAN'],
            ['SMPN 16 Makassar', 'SMPN16'],
            ['SMP Al-Hadi', 'AL-HADI'],
            ['SMPN 23 Makassar', 'SMPN23'],
            ['SMPN 27 Makassar B', 'SMPN27-B'],
            ['SMP 30 Makassar', 'SMP30'],
            ['SMP 12 Makassar', 'SMP12'],
            ['MTs Madani', 'MADANI'],
            ['SMP 29 Makassar', 'SMP29'],
        ];
    }
}
