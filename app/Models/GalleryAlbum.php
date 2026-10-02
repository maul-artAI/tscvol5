<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class GalleryAlbum extends Model
{
    protected $fillable = ['title', 'slug'];

    public function photos(): HasMany
    {
        return $this->hasMany(GalleryPhoto::class, 'album_id');
    }

    /** Sampul otomatis = foto pertama (sort_order, id). */
    public function coverUrl(): ?string
    {
        $first = $this->photos()->where('is_published', true)->orderBy('sort_order')->orderBy('id')->first();

        return $first?->photo_url;
    }
}
