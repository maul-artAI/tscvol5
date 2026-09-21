<?php

namespace Database\Seeders;

use App\Models\News;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class NewsSeeder extends Seeder
{
    public function run(): void
    {
        $items = [
            [
                'title' => 'Telkom School Futsal Cup Vol V Siap Digelar Penuh Spektakuler!',
                'category' => 'Turnamen',
                'excerpt' => 'Turnamen futsal pelajar terbesar di Makassar kembali hadir. Ribuan supporter diprediksi akan memadati tribun lapangan SMK Telkom Makassar.',
                'published_at' => '2026-09-20 10:00:00',
            ],
            [
                'title' => 'Peta Kekuatan Tim SMA: Siapa Kandidat Kuat Juara Tahun Ini?',
                'category' => 'Analisis Tim',
                'excerpt' => 'Menganalisis kekuatan juara bertahan dan tim-tim kuda hitam yang siap memberi kejutan di fase grup Telkom School Futsal Cup Vol V.',
                'published_at' => '2026-09-18 10:00:00',
            ],
            [
                'title' => 'Futsal Builds Better People',
                'category' => 'Feature',
                'excerpt' => 'Lebih dari sekadar turnamen — Telkom School Futsal Cup menanamkan disiplin, respek, dan sportivitas sejak peluit pertama dibunyikan.',
                'published_at' => '2026-09-19 10:00:00',
            ],
        ];

        foreach ($items as $item) {
            News::updateOrCreate(
                ['title' => $item['title']],
                $item + [
                    'slug' => Str::slug($item['title']).'-'.Str::lower(Str::random(6)),
                    'is_published' => true,
                ]
            );
        }
    }
}
