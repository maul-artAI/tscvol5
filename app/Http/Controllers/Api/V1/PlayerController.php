<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Player;
use App\Models\Team;
use App\Traits\HandlesImageUpload;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PlayerController extends Controller
{
    use HandlesImageUpload;
    public function index(Request $request, Team $team): JsonResponse
    {
        $players = $team->players()
            ->when($request->boolean('active_only', true), fn ($q) => $q->where('is_active', true))
            ->get()
            ->append('photo_url');

        return response()->json(['data' => $players]);
    }

    public function store(Request $request, Team $team): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'jersey_number' => ['nullable', 'integer', 'min:1', 'max:99'],
            'position' => ['nullable', 'string', 'max:30'],
            'is_active' => ['sometimes', 'boolean'],
            'photo' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
        ]);

        $player = new Player($validated);
        $player->team()->associate($team);

        if ($request->hasFile('photo')) {
            $player->photo_path = $this->storePhoto($request->file('photo'));
        }

        $player->save();

        return response()->json(['message' => 'Pemain ditambahkan.', 'data' => $player->append('photo_url')], 201);
    }

    public function update(Request $request, Player $player): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:100'],
            'jersey_number' => ['nullable', 'integer', 'min:1', 'max:99'],
            'position' => ['nullable', 'string', 'max:30'],
            'is_active' => ['sometimes', 'boolean'],
            'photo' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
            'remove_photo' => ['sometimes', 'boolean'],
        ]);

        $player->fill($validated);

        if ($request->boolean('remove_photo')) {
            $this->deleteImage($player->photo_path);
            $player->photo_path = null;
        } elseif ($request->hasFile('photo')) {
            $this->deleteImage($player->photo_path);
            $player->photo_path = $this->storePhoto($request->file('photo'));
        }

        $player->save();

        return response()->json(['message' => 'Pemain diperbarui.', 'data' => $player->append('photo_url')]);
    }

    public function destroy(Player $player): JsonResponse
    {
        $this->deleteImage($player->photo_path);

        $player->delete();

        return response()->json(['message' => 'Pemain dihapus.']);
    }
}
