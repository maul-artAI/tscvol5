<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Tambah di akhir agar instant (tanpa rebuild tabel).
        DB::statement("ALTER TABLE `match_events` MODIFY `type` ENUM('goal','yellow_card','red_card','foul','shootout_goal','shootout_miss') NOT NULL");
    }

    public function down(): void
    {
        DB::statement("UPDATE `match_events` SET `type` = 'goal' WHERE `type` IN ('shootout_goal','shootout_miss')");
        DB::statement("ALTER TABLE `match_events` MODIFY `type` ENUM('goal','yellow_card','red_card','foul') NOT NULL");
    }
};
