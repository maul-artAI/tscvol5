<?php

use App\Http\Controllers\Api\V1\BracketController;
use App\Http\Controllers\Api\V1\LandingController;
use App\Http\Controllers\Api\V1\MatchClockController;
use App\Http\Controllers\Api\V1\MatchEventController;
use App\Http\Controllers\Api\V1\MatchReportController;
use App\Http\Controllers\Api\V1\NewsController;
use App\Http\Controllers\Api\V1\PlayerController;
use App\Http\Controllers\Api\V1\SettingController;
use App\Http\Controllers\Api\V1\StandingsController;
use App\Http\Controllers\Api\V1\StatisticsController;
use App\Http\Controllers\Api\V1\TeamController;
use App\Http\Controllers\Api\V1\TournamentMatchController;
use App\Http\Controllers\Api\V1\UserController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\Web\AdminPageController;
use App\Http\Controllers\Web\PublicPageController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Halaman publik (Inertia, tanpa auth)
|--------------------------------------------------------------------------
*/
Route::get('/', [PublicPageController::class, 'landing'])->name('home');
Route::get('/jadwal', [PublicPageController::class, 'jadwal'])->name('jadwal');
Route::get('/klasemen', [PublicPageController::class, 'klasemen'])->name('klasemen');
Route::get('/tim', [PublicPageController::class, 'tim'])->name('tim.index');
Route::get('/tim/{team}', [PublicPageController::class, 'timShow'])->name('tim.show');
Route::get('/berita', [PublicPageController::class, 'berita'])->name('berita.index');
Route::get('/berita/{slug}', [PublicPageController::class, 'beritaShow'])->name('berita.show');
Route::get('/tentang', [PublicPageController::class, 'tentang'])->name('tentang');
Route::get('/bagan', [PublicPageController::class, 'bagan'])->name('bagan');
Route::get('/statistik', [PublicPageController::class, 'statistik'])->name('statistik');
Route::get('/pertandingan/{match}', [PublicPageController::class, 'pertandingan'])->name('pertandingan.show');
Route::get('/matches/{match}/report', [MatchReportController::class, 'show'])->name('matches.report');

/*
|--------------------------------------------------------------------------
| JSON publik pindah ke routes/api.php (grup middleware api yang ramping,
| tanpa session/Inertia — polling lebih cepat).
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| Halaman admin (Inertia, session auth)
|--------------------------------------------------------------------------
*/
Route::middleware('auth')->prefix('admin')->name('admin.')->group(function () {
    Route::get('/', [AdminPageController::class, 'dashboard'])->name('dashboard');
    Route::get('/news', [AdminPageController::class, 'news'])->name('news');

    Route::middleware('role:admin,operator')->group(function () {
        Route::get('/live', [AdminPageController::class, 'live'])->name('live');
        Route::get('/matches', [AdminPageController::class, 'matches'])->name('matches');
        Route::get('/matches/{match}', [AdminPageController::class, 'matchShow'])->name('matches.show');
        Route::get('/teams', [AdminPageController::class, 'teams'])->name('teams');
        Route::get('/players', [AdminPageController::class, 'players'])->name('players');
        Route::get('/bracket', [AdminPageController::class, 'bracket'])->name('bracket');
        Route::get('/settings', [AdminPageController::class, 'settings'])->name('settings');
    });

    Route::middleware('admin')->group(function () {
        Route::get('/users', [AdminPageController::class, 'users'])->name('users');
    });
});

/*
|--------------------------------------------------------------------------
| JSON admin (session auth, dipakai fetch/axios dari React)
|--------------------------------------------------------------------------
*/
Route::middleware('auth')->prefix('api/v1')->group(function () {
    Route::get('/auth/me', function () {
        return request()->user()->only(['id', 'name', 'email', 'role']);
    });

    // Pubdok: hanya berita.
    Route::middleware('role:admin,operator,pubdok')->group(function () {
        Route::post('/news', [NewsController::class, 'store']);
        Route::put('/news/{news}', [NewsController::class, 'update']);
        Route::post('/news/{news}', [NewsController::class, 'update']);
        Route::delete('/news/{news}', [NewsController::class, 'destroy']);
    });

    // Admin + operator: semua kelola turnamen.
    Route::middleware('role:admin,operator')->group(function () {
    Route::post('/teams', [TeamController::class, 'store']);
    Route::put('/teams/{team}', [TeamController::class, 'update']);
    Route::post('/teams/{team}', [TeamController::class, 'update']);
    Route::delete('/teams/{team}', [TeamController::class, 'destroy']);
    Route::post('/matches', [TournamentMatchController::class, 'store']);
    Route::put('/matches/{match}', [TournamentMatchController::class, 'update']);
    Route::patch('/matches/{match}/live', [TournamentMatchController::class, 'updateLive']);
    Route::post('/matches/{match}/clock/start', [MatchClockController::class, 'start']);
    Route::post('/matches/{match}/clock/pause', [MatchClockController::class, 'pause']);
    Route::post('/matches/{match}/clock/reset', [MatchClockController::class, 'reset']);
    Route::delete('/matches/{match}', [TournamentMatchController::class, 'destroy']);
    Route::post('/matches/{match}/events', [MatchEventController::class, 'store']);
    Route::put('/events/{event}', [MatchEventController::class, 'update']);
    Route::delete('/events/{event}', [MatchEventController::class, 'destroy']);
    Route::post('/teams/{team}/players', [PlayerController::class, 'store']);
    Route::put('/players/{player}', [PlayerController::class, 'update']);
    Route::post('/players/{player}', [PlayerController::class, 'update']);
    Route::delete('/players/{player}', [PlayerController::class, 'destroy']);
    Route::put('/settings', [SettingController::class, 'update']);
    Route::post('/bracket/seed-from-groups', [BracketController::class, 'seedFromGroups']);
    });

    Route::middleware('admin')->group(function () {
        Route::get('/users', [UserController::class, 'index']);
        Route::post('/users', [UserController::class, 'store']);
        Route::put('/users/{user}', [UserController::class, 'update']);
        Route::delete('/users/{user}', [UserController::class, 'destroy']);
    });
});

Route::get('/dashboard', function () {
    return to_route('admin.dashboard');
})->middleware(['auth'])->name('dashboard');

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__.'/auth.php';
