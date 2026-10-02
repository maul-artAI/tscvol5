<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('matches', function (Blueprint $table) {
            $table->boolean('is_walkover')->default(false)->after('is_penalty');
        });
        DB::statement("ALTER TABLE `match_events` MODIFY `type` ENUM('goal','yellow_card','red_card','foul','shootout_goal','shootout_miss','own_goal','wo_call') NOT NULL");
    }

    public function down(): void
    {
        Schema::table('matches', function (Blueprint $table) {
            $table->dropColumn('is_walkover');
        });
        DB::statement("UPDATE `match_events` SET `type` = 'foul' WHERE `type` = 'wo_call'");
        DB::statement("ALTER TABLE `match_events` MODIFY `type` ENUM('goal','yellow_card','red_card','foul','shootout_goal','shootout_miss','own_goal') NOT NULL");
    }
};
