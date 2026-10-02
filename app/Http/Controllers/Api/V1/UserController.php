<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    private function ensureAdmin(Request $request): void
    {
        abort_unless($request->user()?->role === 'admin', 403, 'Hanya admin.');
    }

    public function index(Request $request): JsonResponse
    {
        $this->ensureAdmin($request);

        return response()->json([
            'data' => User::orderBy('name')->get(['id', 'name', 'email', 'role', 'created_at']),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->ensureAdmin($request);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'email' => ['required', 'email', 'max:150', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8', 'max:100'],
            'role' => ['required', 'in:admin,operator,pubdok'],
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role' => $validated['role'],
        ]);

        return response()->json(
            ['message' => 'Akun dibuat.', 'data' => $user->only(['id', 'name', 'email', 'role'])],
            201
        );
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $this->ensureAdmin($request);

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:100'],
            'email' => ['sometimes', 'email', 'max:150', Rule::unique('users')->ignore($user->id)],
            'password' => ['sometimes', 'nullable', 'string', 'min:8', 'max:100'],
            'role' => ['sometimes', 'in:admin,operator,pubdok'],
        ]);

        if (($validated['role'] ?? null) !== null && $user->id === $request->user()->id && $validated['role'] !== 'admin') {
            return response()->json(['message' => 'Tidak bisa menurunkan peran akun sendiri.'], 422);
        }

        if (! empty($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        } else {
            unset($validated['password']);
        }

        $user->update($validated);

        return response()->json(
            ['message' => 'Akun diperbarui.', 'data' => $user->only(['id', 'name', 'email', 'role'])]
        );
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        $this->ensureAdmin($request);

        if ($user->id === $request->user()->id) {
            return response()->json(['message' => 'Tidak bisa menghapus akun sendiri.'], 422);
        }

        if ($user->role === 'admin') {
            return response()->json(['message' => 'Akun admin tidak bisa dihapus.'], 422);
        }

        $user->delete();

        return response()->json(['message' => 'Akun dihapus.']);
    }
}
