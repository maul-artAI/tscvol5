<?php

namespace App\Models;

use App\Traits\HandlesImageUpload;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class News extends Model
{
    use HandlesImageUpload, HasFactory;

    protected $fillable = [
        'title',
        'slug',
        'category',
        'cover_path',
        'excerpt',
        'body',
        'is_published',
        'published_at',
    ];

    protected function casts(): array
    {
        return [
            'is_published' => 'boolean',
            'published_at' => 'datetime',
        ];
    }

    protected function coverUrl(): Attribute
    {
        return Attribute::get(fn () => $this->imageUrl($this->cover_path));
    }

    public function scopePublished($query)
    {
        return $query->where('is_published', true);
    }
}
