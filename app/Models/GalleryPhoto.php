<?php

namespace App\Models;

use App\Traits\HandlesImageUpload;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class GalleryPhoto extends Model
{
    use HandlesImageUpload, HasFactory;

    protected $fillable = [
        'album',
        'album_id',
        'path',
        'is_published',
        'sort_order',
    ];

    protected function casts(): array
    {
        return ['is_published' => 'boolean'];
    }

    protected function photoUrl(): Attribute
    {
        return Attribute::get(fn () => $this->imageUrl($this->path));
    }
}
