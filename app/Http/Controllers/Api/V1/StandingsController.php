<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\StandingsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StandingsController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'category' => ['required', 'in:SMA,SMP'],
            'group' => ['nullable', 'string', 'max:20'],
        ]);

        $rows = StandingsService::rows($request->query('category'), $request->query('group'));

        return response()->json(['data' => $rows]);
    }
}
