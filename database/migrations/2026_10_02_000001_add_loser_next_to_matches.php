<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('matches', function (Blueprint $table) {
            $table->foreignId('loser_next_match_id')->nullable()->after('winner_next_side')
                ->constrained('matches')->nullOnDelete();
            $table->enum('loser_next_side', ['team1', 'team2'])->nullable()->after('loser_next_match_id');
        });
    }

    public function down(): void
    {
        Schema::table('matches', function (Blueprint $table) {
            $table->dropConstrainedForeignId('loser_next_match_id');
            $table->dropColumn('loser_next_side');
        });
    }
};
