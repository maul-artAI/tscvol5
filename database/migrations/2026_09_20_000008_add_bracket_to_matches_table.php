<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('matches', function (Blueprint $table) {
            $table->string('round_label', 50)->nullable()->after('stage');
            $table->unsignedTinyInteger('round_order')->default(0)->after('round_label');
            $table->string('slot', 10)->nullable()->after('round_order');
            $table->foreignId('winner_next_match_id')->nullable()->after('slot')
                ->constrained('matches')->nullOnDelete();
            $table->enum('winner_next_side', ['team1', 'team2'])->nullable()->after('winner_next_match_id');
        });
    }

    public function down(): void
    {
        Schema::table('matches', function (Blueprint $table) {
            $table->dropConstrainedForeignId('winner_next_match_id');
            $table->dropColumn(['round_label', 'round_order', 'slot', 'winner_next_side']);
        });
    }
};
