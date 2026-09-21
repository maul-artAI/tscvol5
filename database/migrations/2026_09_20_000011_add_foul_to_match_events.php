<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE `match_events` MODIFY `type` ENUM('goal','yellow_card','red_card','foul') NOT NULL");
    }

    public function down(): void
    {
        DB::statement("UPDATE `match_events` SET `type` = 'yellow_card' WHERE `type` = 'foul'");
        DB::statement("ALTER TABLE `match_events` MODIFY `type` ENUM('goal','yellow_card','red_card') NOT NULL");
    }
};
