<?php

namespace App\Models;

use App\Traits\HandlesImageUpload;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Team extends Model
{
    use HandlesImageUpload, HasFactory;

    protected $appends = ['logo_url'];

    protected $fillable = [
        'name',
        'short_name',
        'category',
        'group_name',
        'description',
        'logo_path',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    protected function logoUrl(): Attribute
    {
        return Attribute::get(fn () => $this->imageUrl($this->logo_path));
    }

    public function team1Matches(): HasMany
    {
        return $this->hasMany(TournamentMatch::class, 'team1_id');
    }

    public function players(): HasMany
    {
        return $this->hasMany(Player::class)->orderBy('jersey_number')->orderBy('name');
    }    public function team2Matches(): HasMany
    {
        return $this->hasMany(TournamentMatch::class, 'team2_id');
    }
}
