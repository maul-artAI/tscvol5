<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        // Logo situs dibagikan server-side agar navbar langsung tampil benar
        // tanpa kilatan logo default (tanpa fetch susulan di client).
        $logos = \App\Models\Setting::whereIn('key', ['logo_tsc', 'logo_smk'])
            ->pluck('value', 'key')
            ->all();

        return [
            ...parent::share($request),
            'auth' => [
                'user' => $request->user(),
            ],
            'siteLogos' => [
                'tsc' => $logos['logo_tsc'] ?? null,
                'smk' => $logos['logo_smk'] ?? null,
            ],
        ];
    }
}
