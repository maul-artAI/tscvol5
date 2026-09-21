<?php

use App\Http\Controllers\Api\V1\BracketController;
use App\Http\Controllers\Api\V1\LandingController;
use App\Http\Controllers\Api\V1\NewsController;
use App\Http\Controllers\Api\V1\PlayerController;
use App\Http\Controllers\Api\V1\SettingController;
use App\Http\Controllers\Api\V1\StandingsController;
use App\Http\Controllers\Api\V1\StatisticsController;
use App\Http\Controllers\Api\V1\TeamController;
use App\Http\Controllers\Api\V1\TournamentMatchController;
use Illuminate\Support\Facades\Route;

/*
 * JSON publik tanpa session (polling cepat).
 * Framework memberi prefix /api; v1 ditambah di sini.
 * Mutasi admin tetap di web.php (session).
 */
Route::prefix('v1')->group(function () {
Route::get('/teams', [TeamController::class, 'index']);
Route::get('/teams/{team}', [TeamController::class, 'show']);
Route::get('/matches', [TournamentMatchController::class, 'index']);
Route::get('/matches/live', [TournamentMatchController::class, 'live']);
Route::get('/matches/{match}', [TournamentMatchController::class, 'show']);
Route::get('/standings', [StandingsController::class, 'index']);
Route::get('/bracket', [BracketController::class, 'index']);
Route::get('/statistics/top', [StatisticsController::class, 'top']);
Route::get('/teams/{team}/players', [PlayerController::class, 'index']);
Route::get('/news', [NewsController::class, 'index']);
Route::get('/news/{slug}', [NewsController::class, 'show']);
Route::get('/settings', [SettingController::class, 'index']);
Route::get('/landing', [LandingController::class, 'index']);
});
