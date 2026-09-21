<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\News;
use App\Traits\HandlesImageUpload;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class NewsController extends Controller
{
    use HandlesImageUpload;
    public function index(Request $request): JsonResponse
    {
        $news = News::published()
            ->when($request->query('category'), fn ($q, $v) => $q->where('category', $v))
            ->orderByDesc('published_at')
            ->orderByDesc('id')
            ->paginate($request->integer('per_page', 9));

        $news->getCollection()->each->append('cover_url');

        return response()->json($news);
    }

    public function show(string $slug): JsonResponse
    {
        $item = News::published()->where('slug', $slug)->firstOrFail();

        return response()->json(['data' => $item->append('cover_url')]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:200'],
            'category' => ['sometimes', 'string', 'max:50'],
            'excerpt' => ['nullable', 'string'],
            'body' => ['nullable', 'string'],
            'is_published' => ['sometimes', 'boolean'],
            'published_at' => ['nullable', 'date'],
            'cover' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:8192'],
            'remove_cover' => ['sometimes', 'boolean'],
        ]);

        $item = new News($validated);
        $item->slug = Str::slug($validated['title']).'-'.Str::lower(Str::random(6));
        $item->published_at ??= now();

        if ($request->hasFile('cover')) {
            $item->cover_path = $this->storeCover($request->file('cover'));
        }

        $item->save();

        return response()->json(['message' => 'Berita dibuat.', 'data' => $item->append('cover_url')], 201);
    }

    public function update(Request $request, News $news): JsonResponse
    {
        $validated = $request->validate([
            'title' => ['sometimes', 'string', 'max:200'],
            'category' => ['sometimes', 'string', 'max:50'],
            'excerpt' => ['nullable', 'string'],
            'body' => ['nullable', 'string'],
            'is_published' => ['sometimes', 'boolean'],
            'published_at' => ['nullable', 'date'],
            'cover' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:8192'],
            'remove_cover' => ['sometimes', 'boolean'],
        ]);

        $news->fill($validated);

        if ($request->boolean('remove_cover')) {
            $this->deleteImage($news->cover_path);
            $news->cover_path = null;
        } elseif ($request->hasFile('cover')) {
            $this->deleteImage($news->cover_path);
            $news->cover_path = $this->storeCover($request->file('cover'));
        }

        $news->save();

        return response()->json(['message' => 'Berita diperbarui.', 'data' => $news->append('cover_url')]);
    }

    public function destroy(News $news): JsonResponse
    {
        $this->deleteImage($news->cover_path);

        $news->delete();

        return response()->json(['message' => 'Berita dihapus.']);
    }
}
