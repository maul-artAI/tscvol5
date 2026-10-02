<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Traits\HandlesImageUpload;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class SettingController extends Controller
{
    use HandlesImageUpload;

    /** Kunci gambar yang dikelola sebagai berkas: dir + lebar maks (px). */
    private const IMAGES = [
        'logo_tsc' => ['dir' => 'site-logos', 'width' => 512],
        'logo_smk' => ['dir' => 'site-logos', 'width' => 512],
        'hero_bg' => ['dir' => 'site-backgrounds', 'width' => 1920],
    ];
    public function index(): JsonResponse
    {
        return response()->json(['data' => Setting::allAsArray()]);
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'settings' => ['sometimes', 'array'],
            'settings.*' => ['nullable', 'string'],
            'logo_tsc' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp,svg', 'max:2048'],
            'logo_smk' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp,svg', 'max:2048'],
            'hero_bg' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'remove_logo_tsc' => ['sometimes', 'boolean'],
            'remove_logo_smk' => ['sometimes', 'boolean'],
            'remove_hero_bg' => ['sometimes', 'boolean'],
        ]);

        foreach ($validated['settings'] ?? [] as $key => $value) {
            if (array_key_exists($key, self::IMAGES)) {
                continue;
            }
            Setting::updateOrCreate(['key' => $key], ['value' => $value]);
        }

        foreach (self::IMAGES as $key => $cfg) {
            if ($request->boolean("remove_{$key}")) {
                $this->deleteLogoFile($key);
                Setting::updateOrCreate(['key' => $key], ['value' => null]);
            }
            if ($request->hasFile($key)) {
                $this->deleteLogoFile($key);
                $file = $request->file($key);
                if (strtolower($file->getClientOriginalExtension()) === 'svg') {
                    $path = $file->store($cfg['dir'], 'public');
                } else {
                    $path = $this->storeWebp($file, $cfg['dir'], $cfg['width'], null);
                }
                Setting::updateOrCreate(['key' => $key], ['value' => Storage::disk('public')->url($path)]);
            }
        }

        return response()->json(['message' => 'Pengaturan disimpan.', 'data' => Setting::allAsArray()]);
    }

    private function deleteLogoFile(string $key): void
    {
        $url = Setting::where('key', $key)->value('value');
        $path = $url ? $this->pathFromUrl($url) : null;
        if ($path) {
            Storage::disk('public')->delete($path);
        }
    }

    private function pathFromUrl(string $url): ?string
    {
        $path = parse_url($url, PHP_URL_PATH);
        if (! $path) {
            return null;
        }
        $path = ltrim($path, '/');
        // URL path-style: {bucket}/{key}
        $bucket = (string) config('filesystems.disks.public.bucket', '');
        if ($bucket !== '' && str_starts_with($path, $bucket.'/')) {
            return substr($path, strlen($bucket) + 1);
        }
        // URL lokal lama: storage/{key}
        if (str_starts_with($path, 'storage/')) {
            return substr($path, strlen('storage/'));
        }
        return null;
    }
}
