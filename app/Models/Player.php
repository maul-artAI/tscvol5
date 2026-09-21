<?php

namespace App\Models;

use App\Traits\HandlesImageUpload;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Player extends Model
{
    use HandlesImageUpload, HasFactory;

    protected $fillable = [
        'team_id',
        'name',
        'jersey_number',
        'position',
        'photo_path',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    protected function photoUrl(): Attribute
    {
        return Attribute::get(fn () => $this->imageUrl($this->photo_path));
    }

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }
}
