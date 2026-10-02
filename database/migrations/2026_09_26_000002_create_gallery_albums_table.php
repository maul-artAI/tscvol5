<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('gallery_albums', function (Blueprint $table) {
            $table->id();
            $table->string('title', 100);
            $table->string('slug', 120)->unique();
            $table->timestamps();
        });

        Schema::table('gallery_photos', function (Blueprint $table) {
            $table->foreignId('album_id')->nullable()->after('album')->constrained('gallery_albums')->nullOnDelete();
            $table->index('album_id');
        });
    }

    public function down(): void
    {
        Schema::table('gallery_photos', function (Blueprint $table) {
            $table->dropConstrainedForeignId('album_id');
        });
        Schema::dropIfExists('gallery_albums');
    }
};
