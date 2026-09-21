<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('match_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('match_id')->constrained('matches')->cascadeOnDelete();
            $table->unsignedSmallInteger('minute');
            $table->enum('team_side', ['team1', 'team2']);
            $table->enum('type', ['goal', 'yellow_card', 'red_card']);
            $table->string('player_name');
            $table->string('assist_name')->nullable();
            $table->timestamps();

            $table->index(['match_id', 'minute']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('match_events');
    }
};
