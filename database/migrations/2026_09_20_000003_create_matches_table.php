<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('matches', function (Blueprint $table) {
            $table->id();
            $table->enum('category', ['SMA', 'SMP']);
            $table->string('stage')->nullable();
            $table->string('lapangan', 50)->nullable();
            $table->string('venue')->nullable();
            $table->date('match_date');
            $table->time('kickoff')->nullable();
            $table->foreignId('team1_id')->nullable()->constrained('teams')->cascadeOnDelete();
            $table->foreignId('team2_id')->nullable()->constrained('teams')->cascadeOnDelete();
            $table->unsignedTinyInteger('team1_score')->default(0);
            $table->unsignedTinyInteger('team2_score')->default(0);
            $table->enum('status', ['scheduled', 'live', 'finished'])->default('scheduled');
            $table->string('period', 20)->nullable();
            $table->string('clock', 10)->nullable();
            $table->timestamps();

            $table->index(['match_date', 'status']);
            $table->index('category');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('matches');
    }
};
