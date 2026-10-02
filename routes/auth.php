<?php

use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\Auth\PasswordController;
use Illuminate\Support\Facades\Route;

Route::middleware('guest')->group(function () {
    // Registrasi publik DINONAKTIFKAN — akun dibuat lewat menu Akun oleh admin.
    // Reset password via email DINONAKTIFKAN (tanpa mail server).

    Route::get('rahasiabosku', [AuthenticatedSessionController::class, 'create'])
        ->name('login');

    Route::post('rahasiabosku', [AuthenticatedSessionController::class, 'store']);
});

Route::middleware('auth')->group(function () {
    Route::post('logout', [AuthenticatedSessionController::class, 'destroy'])
        ->name('logout');

    Route::put('password', [PasswordController::class, 'update'])
        ->name('password.update');
});
