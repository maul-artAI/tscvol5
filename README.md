# TSC-App — Telkom School Futsal Cup Vol V (Laravel 12 + Inertia + React)

Satu aplikasi penuh: tidak ada lagi frontend terpisah. Semua halaman
dirender server (props selalu fresh, tanpa cache basi) + interaksi React.

## Menjalankan

Klik 2x **`start.bat`** (menyalakan MariaDB bila perlu + serve :8000).
Atau manual:

```text
php artisan serve --host=0.0.0.0 --port=8000
```

Untuk develop frontend (hot-reload):

```text
npm run dev      # butuh Node 22: ..\tools\node-v22.23.2-win-x64
```

Untuk production build frontend: `npm run build`.

- Landing: http://IP-PC:8000 (ganti IP sesuai WiFi, lihat output start.bat)
- Admin: http://IP-PC:8000/admin — `admin@tsc.local` / `admin123` (SEGERA GANTI)
- Database: `tsc_futsal` di MariaDB FlyEnv. **JANGAN `migrate:fresh`.**

## Struktur penting

- `routes/web.php` — semua rute (publik Inertia, JSON polling, JSON admin, BAP).
- `app/Http/Controllers/Web/` — PublicPageController, AdminPageController.
- `app/Http/Controllers/Api/` — dipakai ulang untuk JSON (baca publik + tulis admin via session).
- `resources/js/Pages/{Public,Admin,Auth}` + `Components/` + `Layouts/` + `lib/api.ts`.
- Upload: `storage/app/public` (sudah terisi logo), symlink `public/storage` aktif.
- Auth: session Breeze (12 jam), registrasi & reset-password dimatikan,
  throttle login bawaan Breeze, halaman Akun khusus peran admin.

## Aturan yang dijaga sistem

1 lapangan = 1 laga live • pemenang knockout auto-maju (tidak menimpa slot
terisi) • seed R16 hanya dari grup yang 100% selesai • file lama terhapus
saat diganti/dihapus datanya • token tidak dipakai lagi (session).

## Arsip

Kode lama (Next.js + API terpisah) ada di folder `TSC-Arsip-Nextjs/`
+ backup database `prek-rebuild-backup.sql` di folder lama. Jangan dihapus
minimal 1 turnamen penuh.
