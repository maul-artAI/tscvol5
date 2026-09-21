<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Team;
use App\Traits\HandlesImageUpload;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TeamController extends Controller
{
    use HandlesImageUpload;
    public function index(Request $request): JsonResponse
    {
        $teams = Team::query()
            ->when($request->query('category'), fn ($q, $v) => $q->where('category', $v))
            ->when($request->boolean('active_only', true), fn ($q) => $q->where('is_active', true))
            ->withCount('players')
            ->orderBy('category')
            ->orderBy('name')
            ->get()
            ->append('logo_url');

        return response()->json(['data' => $teams]);
    }

    public function show(Team $team): JsonResponse
    {
        $team->load(['players' => fn ($q) => $q->where('is_active', true)]);
        $team->players->each->append('photo_url');

        return response()->json(['data' => $team->append('logo_url')]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'short_name' => ['nullable', 'string', 'max:10'],
            'category' => ['required', 'in:SMA,SMP'],
            'group_name' => ['nullable', 'string', 'max:20'],
            'description' => ['nullable', 'string'],
            'is_active' => ['sometimes', 'boolean'],
            'logo' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
        ]);

        $team = new Team($validated);

        if ($request->hasFile('logo')) {
            $team->logo_path = $this->storeLogo($request->file('logo'));
        }

        $team->save();

        return response()->json(['message' => 'Tim dibuat.', 'data' => $team->append('logo_url')], 201);
    }

    public function update(Request $request, Team $team): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:100'],
            'short_name' => ['nullable', 'string', 'max:10'],
            'category' => ['sometimes', 'in:SMA,SMP'],
            'group_name' => ['nullable', 'string', 'max:20'],
            'description' => ['nullable', 'string'],
            'is_active' => ['sometimes', 'boolean'],
            'logo' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
            'remove_logo' => ['sometimes', 'boolean'],
        ]);

        $team->fill($validated);

        if ($request->boolean('remove_logo')) {
            $this->deleteImage($team->logo_path);
            $team->logo_path = null;
        } elseif ($request->hasFile('logo')) {
            $this->deleteImage($team->logo_path);
            $team->logo_path = $this->storeLogo($request->file('logo'));
        }

        $team->save();

        return response()->json(['message' => 'Tim diperbarui.', 'data' => $team->append('logo_url')]);
    }

    public function destroy(Team $team): JsonResponse
    {
        $this->deleteImage($team->logo_path);

        $team->delete();

        return response()->json(['message' => 'Tim dihapus.']);
    }
}
