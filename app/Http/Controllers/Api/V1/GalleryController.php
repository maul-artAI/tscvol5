<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\GalleryAlbum;
use App\Models\GalleryPhoto;
use App\Traits\HandlesImageUpload;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class GalleryController extends Controller
{
    use HandlesImageUpload;

    public const MAX_PER_ALBUM = 20;

    /** Daftar album + sampul otomatis + jumlah foto (12/halaman, maks 100). */
    public function albums(Request $request): JsonResponse
    {
        $perPage = max(1, min(100, $request->integer('per_page', 12)));
        $albums = GalleryAlbum::orderByDesc('id')->paginate($perPage);
        $albums->getCollection()->transform(fn ($a) => [
            'id' => $a->id,
            'title' => $a->title,
            'slug' => $a->slug,
            'count' => $a->photos()->where('is_published', true)->count(),
            'cover_url' => $a->coverUrl(),
            'created_at' => $a->created_at,
        ]);

        return response()->json($albums);
    }

    /** Isi satu album by slug. */
    public function albumShow(string $slug): JsonResponse
    {
        $album = GalleryAlbum::where('slug', $slug)->firstOrFail();
        $photos = $album->photos()->where('is_published', true)->orderBy('sort_order')->orderBy('id')->get()->append('photo_url');

        return response()->json(['data' => [
            'id' => $album->id,
            'title' => $album->title,
            'slug' => $album->slug,
            'photos' => $photos,
        ]]);
    }

    public function index(Request $request): JsonResponse
    {
        $photos = GalleryPhoto::query()
            ->where('is_published', true)
            ->when($request->query('album'), fn ($q, $v) => $q->where('album', $v))
            ->when($request->query('album_id'), fn ($q, $v) => $q->where('album_id', $v))
            ->orderBy('album')
            ->orderBy('sort_order')
            ->orderByDesc('id')
            ->paginate($request->integer('per_page', 24));

        $photos->getCollection()->each->append('photo_url');

        return response()->json($photos);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'album_id' => ['nullable', 'integer', 'exists:gallery_albums,id'],
            'album' => ['nullable', 'string', 'max:100'],
            'photos' => ['required', 'array', 'max:5'],
            'photos.*' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:8192'],
        ]);

        $album = null;
        if (! empty($validated['album_id'])) {
            $album = GalleryAlbum::findOrFail($validated['album_id']);
        } else {
            $title = trim($validated['album'] ?? '') !== '' ? trim($validated['album']) : 'Dokumentasi';
            $album = GalleryAlbum::where('title', $title)->first();
            if (! $album) {
                $slug = Str::slug($title) ?: 'album';
                $base = $slug;
                $i = 2;
                while (GalleryAlbum::where('slug', $slug)->exists()) {
                    $slug = "$base-$i";
                    $i++;
                }
                $album = GalleryAlbum::create(['title' => $title, 'slug' => $slug]);
            }
        }

        $existing = GalleryPhoto::where('album_id', $album->id)->count();
        $incoming = count($request->file('photos'));
        if ($existing + $incoming > self::MAX_PER_ALBUM) {
            return response()->json(
                ['message' => "Album \"{$album->title}\" maksimal ".self::MAX_PER_ALBUM." foto (sudah ada $existing)."],
                422
            );
        }

        $base = (int) (GalleryPhoto::where('album_id', $album->id)->max('sort_order') ?? 0);
        $saved = [];

        foreach ($request->file('photos') as $i => $file) {
            $path = $this->storeWebp($file, 'gallery', 1280, null);
            if (! $path) {
                continue;
            }
            $saved[] = GalleryPhoto::create([
                'album' => $album->title,
                'album_id' => $album->id,
                'path' => $path,
                'sort_order' => $base + $i + 1,
            ])->append('photo_url');
        }

        return response()->json(
            ['message' => count($saved).' foto ditambahkan ke album "'.$album->title.'".', 'data' => $saved, 'album_slug' => $album->slug],
            201
        );
    }

    public function destroy(GalleryPhoto $gallery): JsonResponse
    {
        $this->deleteImage($gallery->path);
        $gallery->delete();

        return response()->json(['message' => 'Foto dihapus.']);
    }

    /** Hapus album + seluruh foto & objek S3 di dalamnya. */
    public function destroyAlbum(GalleryAlbum $album): JsonResponse
    {
        foreach ($album->photos()->get() as $photo) {
            $this->deleteImage($photo->path);
            $photo->delete();
        }
        $title = $album->title;
        $album->delete();

        return response()->json(['message' => "Album \"$title\" beserta isinya dihapus."]);
    }
}
