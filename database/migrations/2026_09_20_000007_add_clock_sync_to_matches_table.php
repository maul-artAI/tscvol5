<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('matches', function (Blueprint $table) {
            $table->unsignedInteger('clock_seconds')->default(0)->after('clock');
            $table->boolean('clock_running')->default(false)->after('clock_seconds');
            $table->timestamp('clock_updated_at')->nullable()->after('clock_running');
        });
    }

    public function down(): void
    {
        Schema::table('matches', function (Blueprint $table) {
            $table->dropColumn(['clock_seconds', 'clock_running', 'clock_updated_at']);
        });
    }
};
