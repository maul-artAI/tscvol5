<?php

namespace App\Traits;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

trait HandlesImageUpload
{
    protected function storeLogo(?UploadedFile $file): ?string
    {
        return $this->storeWebp($file, 'team-logos', 512, null);
    }

    protected function storeCover(?UploadedFile $file): ?string
    {
        return $this->storeWebp($file, 'news-covers', 1280, [16, 9]);
    }

    protected function storePhoto(?UploadedFile $file): ?string
    {
        return $this->storeWebp($file, 'player-photos', 512, null);
    }

    /**
     * Simpan sebagai WebP yang ringan. Opsional: batasi lebar & crop rasio.
     */
    protected function storeWebp(?UploadedFile $file, string $directory, int $maxWidth = 1280, ?array $ratio = null): ?string
    {
        if (! $file) {
            return null;
        }

        $src = @imagecreatefromstring(file_get_contents($file->getRealPath()));
        if (! $src) {
            // Bukan gambar valid GD — simpan apa adanya.
            return $file->store($directory, 'public');
        }

        $src = $this->applyExifOrientation($src, $file->getRealPath());

        $w = imagesx($src);
        $h = imagesy($src);

        if ($ratio) {
            [$rw, $rh] = $ratio;
            $target = $rw / $rh;
            $current = $w / $h;
            if ($current > $target) {
                $nw = (int) ($h * $target);
                $x = (int) (($w - $nw) / 2);
                $src = imagecrop($src, ['x' => $x, 'y' => 0, 'width' => $nw, 'height' => $h]) ?: $src;
            } else {
                $nh = (int) ($w / $target);
                $y = (int) (($h - $nh) / 2);
                $src = imagecrop($src, ['x' => 0, 'y' => $y, 'width' => $w, 'height' => $nh]) ?: $src;
            }
            $w = imagesx($src);
            $h = imagesy($src);
        }

        if ($w > $maxWidth) {
            $nh = (int) ($h * $maxWidth / $w);
            $dst = imagecreatetruecolor($maxWidth, $nh);
            imagealphablending($dst, false);
            imagesavealpha($dst, true);
            imagecopyresampled($dst, $src, 0, 0, 0, 0, $maxWidth, $nh, $w, $h);
            imagedestroy($src);
            $src = $dst;
        }

        ob_start();
        imagewebp($src, null, 82);
        $bytes = ob_get_clean();
        imagedestroy($src);

        $path = $directory.'/'.Str::random(40).'.webp';
        Storage::disk('public')->put($path, $bytes);

        return $path;
    }

    private function applyExifOrientation($img, string $path)
    {
        if (! function_exists('exif_read_data')) {
            return $img;
        }

        $exif = @exif_read_data($path);
        $orientation = $exif['Orientation'] ?? 1;

        switch ($orientation) {
            case 3:
                $img = imagerotate($img, 180, 0);
                break;
            case 6:
                $img = imagerotate($img, -90, 0);
                break;
            case 8:
                $img = imagerotate($img, 90, 0);
                break;
            case 5:
                $img = imagerotate($img, -90, 0);
                // no break - fallthrough intended for mirror handling below
            case 4:
            case 7:
                if (function_exists('imageflip')) {
                    imageflip($img, IMG_FLIP_HORIZONTAL);
                }
                break;
        }

        return $img;
    }

    protected function storeImage(?UploadedFile $file, string $directory): ?string
    {
        return $this->storeWebp($file, $directory);
    }

    protected function replaceImage(?UploadedFile $file, ?string $oldPath, string $directory): ?string
    {
        if (! $file) {
            return $oldPath;
        }

        $this->deleteImage($oldPath);

        return $this->storeWebp($file, $directory);
    }

    protected function deleteImage(?string $path): void
    {
        if ($path && Storage::disk('public')->exists($path)) {
            Storage::disk('public')->delete($path);
        }
    }

    protected function imageUrl(?string $path): ?string
    {
        if (! $path) {
            return null;
        }

        return asset('storage/'.ltrim($path, '/'));
    }
}
