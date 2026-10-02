<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('matches', function (Blueprint $table) {
            $table->unsignedTinyInteger('penalty1')->nullable()->after('team2_score');
            $table->unsignedTinyInteger('penalty2')->nullable()->after('penalty1');
            $table->boolean('is_penalty')->default(false)->after('penalty2');
        });
    }

    public function down(): void
    {
        Schema::table('matches', function (Blueprint $table) {
            $table->dropColumn(['penalty1', 'penalty2', 'is_penalty']);
        });
    }
};
