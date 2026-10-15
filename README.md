# TSC Vol V — Sistem Informasi Turnamen Futsal Telkom School Cup

Aplikasi web penuh turnamen futsal **Telkom School Cup Vol V** (SMA/SMK & SMP se-Sulawesi Selatan):
portal publik real-time (jadwal, live score, bracket, klasemen, statistik, berita, galeri)
+ panel admin lengkap (dashboard grafik, live control, tim, pemain, jadwal, bracket drag-and-drop,
berita + galeri, pengaturan, akun).

> Stack: **Laravel 12 + Inertia.js v2 + React 18 + Vite + Tailwind CSS** dalam SATU aplikasi
> (tidak ada frontend terpisah). Props Inertia selalu fresh dari server.

URL produksi: **https://tsc-vol5.my.id** · Login admin: **/rahasiabosku** (bukan `/login`).

---

## Daftar Isi

1. [Fitur](#1-fitur)
2. [Tech stack](#2-tech-stack)
3. [Pola arsitektur penting](#3-pola-arsitektur-penting)
4. [Struktur proyek](#4-struktur-proyek)
5. [Instalasi lokal (development)](#5-instalasi-lokal-development)
6. [Deploy produksi (VPS)](#6-deploy-produksi-vps)
7. [Konfigurasi `.env`](#7-konfigurasi-env)
8. [Database, migrasi & seeder](#8-database-migrasi--seeder)
9. [Aturan bisnis penting](#9-aturan-bisnis-penting)
10. [Role & akun](#10-role--akun)
11. [Storage S3](#11-storage-s3)
12. [Realtime (WebSocket)](#12-realtime-websocket)
13. [Perintah verifikasi](#13-perintah-verifikasi)
14. [Troubleshooting](#14-troubleshooting)
15. [Git workflow](#15-git-workflow)

---

## 1. Fitur

### Publik (tanpa login)
| Halaman | URL | Keterangan |
|---|---|---|
| Beranda | `/` | Hero + kartu live (realtime + timer berdetak), Jadwal & Skor (SMA/SMP berdampingan, filter Live/Upcoming/Selesai/Semua + expander), bracket, berita (maks 3), galeri |
| Jadwal | `/jadwal` | Filter kategori + tanggal, animasi reveal |
| Live Score anchor | `/#skor` | Scroll ke section skor + polling/socket |
| Bagan | `/bagan` | Diagram knockout + juara 1/2/3, slot kosong berlabel sumber (`WIN Grup A`, `Pemenang R16-1`) |
| Klasemen | `/klasemen` | Blok SMA/SMK + SMP, kolom M M S K **GM GK SG** PTS |
| Tim / detail | `/tim`, `/tim/{id}` | Daftar + skuad + jadwal tim |
| Statistik | `/statistik` | Top Skor SMA berdampingan SMP (assist disembunyikan) |
| Berita | `/berita`, `/berita/{slug}` | List + single page |
| Galeri | `/galeri`, `/galeri/{slug}` | Kartu album (12/halaman) + lightbox + prev/next |
| Tentang | `/tentang` | Info turnamen dari settings |

### Admin (`/admin/*`, login session)
| Halaman | Fungsi |
|---|---|
| `/admin` Dashboard | 4 kartu + live + donut progres + top skor + heatmap linimasa/hari |
| `/admin/live` | Live control + socket + indikator koneksi |
| `/admin/teams` | CRUD tim + logo (grup opsional/"Belum ada grup") |
| `/admin/players` | Skuad per tim + tambah massal + rencana bulk foto |
| `/admin/matches`, `/admin/matches/{id}` | Jadwal + Live Control meja (skor, penalti, WO, foul, kartu, event, BAP PDF) |
| `/admin/bracket` | Bracket DnD antar-slot, Tarik juara/runner-up, lapangan & jadwal per slot |
| `/admin/news`, `/create`, `/{id}/edit` | Editor TipTap + drag-drop foto + pratinjau |
| `/admin/gallery`, `/create`, `/{slug}` | Album (maks 20 foto, batch 5 berprogres) |
| `/admin/settings` | Teks + logo TSC/SMK + background hero (WebP otomatis) |
| `/admin/users` | Akun (admin tak bisa dihapus, proteksi diri) |
| `/profile` | Profil + ganti password (hapus akun **dinonaktifkan**) |

---

## 2. Tech stack

| Layer | Teknologi |
|---|---|
| Backend | PHP 8.4, Laravel 12, Inertia v2 |
| Frontend | React 18, Vite 7, Tailwind CSS v4, Recharts (dashboard), dnd-kit (bracket), TipTap (editor), FontAwesome |
| Realtime | Laravel Reverb 1.x + Laravel Echo + pusher-js |
| Database | MySQL 8 (`tscvol5`), session/cache/queue = `database` (tanpa Redis) |
| Storage | S3-compatible (Neva Objects), disk `public` = S3 |
| Server | Ubuntu 24.04, Nginx, PHP-FPM pool terpisah, TLS Let's Encrypt, Cloudflare (proxy) |

Yang **tidak** dipakai: Redis, Sanctum API token, Horizon, Telescope.

---

## 3. Pola arsitektur penting

- **Server-side props dulu.** Halaman admin dirender dengan data awal via `AdminPageController`
  (1 round-trip per navigasi). Fetch client hanya untuk mutasi, polling, ganti tab.
- **Auth = session cookie.** JSON admin di `routes/web.php` (`auth` + `role:*`/`admin`).
  JSON publik di `routes/api.php` (prefix `/api`, tanpa session — polling cepat).
- **FormData + POST.** PHP tidak mem-parsing body multipart pada PUT — endpoint update file
  memakai alias `POST` (`/teams/{id}`, `/news/{id}`, `/settings`).
- **Jangan pakai `Storage::exists()/size()` di S3** untuk logika hapus — endpoint Neva
  kadang 403/ basi sesaat setelah hapus. Hapus langsung + verifikasi via listing.
- **Gambar selalu WebP** via `HandlesImageUpload::storeWebp()` (GD). PNG/GIF *palette*
  dikonversi ke truecolor dulu (`imagewebp` menolak palette → dulu 500). SVG dipertahankan.
- **OPcache agresif di FPM.** Setiap deploy PHP wajib `systemctl reload php8.4-fpm`,
  kalau tidak kode baru tidak terbaca walau file sudah di disk.

---

## 4. Struktur proyek

```
tscvol5/
├── app/Events/MatchUpdated.php      # broadcast skor (channel publik `scores`)
├── app/Http/Controllers/
│   ├── Api/V1/                      # Team, Player, TournamentMatch, MatchEvent,
│   │                                # MatchClock, MatchReport(BAP PDF), News,
│   │                                # Bracket, Setting, Gallery, User, ...
│   └── Web/AdminPageController.php  # props awal semua halaman admin
│   └── Web/PublicPageController.php # landing, jadwal, bagan, tim, statistik, ...
├── app/Models/                      # Team, Player, TournamentMatch (advanceWinner/
│                                    # advanceLoser/resolveWinnerId), MatchEvent
│                                    # (hook sinkron penalti), News, GalleryAlbum/Photo, Setting
├── app/Services/StandingsService.php# klasemen: poin → SG → GM → nama
├── app/Traits/HandlesImageUpload.php# WebP + URL + hapus + anti-HEAD-flaky
├── config/filesystems.php           # disk `public` = s3
├── database/migrations/             # ..._add_penalty, _shootout, _own_goal, _walkover,
│                                    # _period, gallery_*, loser_next, ...
├── database/seeders/                # TeamSeeder (64 tim asli), BracketSeeder (idempoten)
├── resources/js/
│   ├── Components/                  # Navbar, ScoreBoard, BracketDiagram, LiveMatchCard,
│   │                                # Feedback (toast+confirm), Reveal, DailyMatchTimelineHeatmap, ...
│   ├── Layouts/AdminLayout.tsx      # topbar, sidebar toggle/drawer, breadcrumb, profil
│   └── Pages/Admin|Public|Auth|Profile
├── resources/views/reports/berita-acara.blade.php  # PDF BAP
└── routes/web.php, api.php, auth.php
```

---

## 5. Instalasi lokal (development)

```bash
composer install
cp .env.example .env
php artisan key:generate
# arahkan DB_* ke MySQL lokal, atau sqlite untuk coba cepat
php artisan migrate --force
php artisan db:seed --force        # AdminSeeder + SettingSeeder (+ TeamSeeder bila perlu)
npm install && npm run build       # atau npm run dev untuk HMR
php artisan serve                  # http://127.0.0.1:8000
```

Akun awal (seeder): `admin@tsc.local` / `admin123` — **wajib diganti** di produksi
(produksi memakai `admin@tsc-vol5.my.id`).

---

## 6. Deploy produksi (VPS)

Server: `bbws` (Ubuntu 24.04, 2 vCPU, 3.8 GB RAM) — berbagi dengan aplikasi absensi
(`/root/absensi-pu`, domain `siappomjen.id`). **Jangan ganggu** pool FPM, vhost, dan
database absensi.

| Komponen | Lokasi / nama |
|---|---|
| Kode | `/root/tscvol5` (branch `production`) |
| Nginx vhost | `/etc/nginx/sites-available/tscvol5` (443 + redirect 80; proxy `/app/` → Reverb) |
| PHP-FPM pool | `/etc/php/8.4/fpm/pool.d/tscvol5.conf` (socket `php8.4-fpm-tscvol5.sock`, ondemand max 5) |
| Database | MySQL `tscvol5`, user `tscvol5` (password di `/root/.dbpass_tscvol5`, mode 600) |
| Reverb service | `tsc-reverb.service` (127.0.0.1:8090, user www-data, auto-restart) |
| TLS | Let's Encrypt via certbot (`certbot --nginx -d tsc-vol5.my.id`); renew otomatis |
| Firewall | UFW aktif; hanya 80/443 (+22). Reverb TIDAK buka port publik (via proxy Nginx) |

Urutan deploy tiap rilis:

```bash
cd /root/tscvol5 && git pull origin production
COMPOSER_ALLOW_SUPERUSER=1 composer install --no-dev --prefer-dist --optimize-autoloader --no-interaction
php artisan migrate --force
npm ci && npm run build
chown -R www-data:www-data storage bootstrap/cache public/build
php artisan config:cache && php artisan route:cache && php artisan view:cache
systemctl reload php8.4-fpm
systemctl reload nginx            # hanya bila vhost berubah (nginx -t dulu)
systemctl restart tsc-reverb      # hanya bila event/kode socket berubah
```

> Catatan: `public/build` dan `.env` tidak ikut git (ter-ignore). Kredensial cukup di server.

---

## 7. Konfigurasi `.env`

Selain bawaan Laravel, yang dipakai aplikasi:

```env
APP_URL=https://tsc-vol5.my.id
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=tscvol5
DB_USERNAME=tscvol5
DB_PASSWORD=********

SESSION_DRIVER=database
CACHE_STORE=database
QUEUE_CONNECTION=database
FILESYSTEM_DISK=local

# S3 Neva Objects (disk `public`)
AWS_ACCESS_KEY_ID=********
AWS_SECRET_ACCESS_KEY=********
AWS_DEFAULT_REGION=us-east-1
AWS_BUCKET=tsc-bucket
AWS_ENDPOINT=https://s3.nevaobjects.id
AWS_USE_PATH_STYLE_ENDPOINT=true
AWS_URL=https://s3.nevaobjects.id/tsc-bucket

# Reverb (server publish lokal, klien wss via Nginx)
BROADCAST_CONNECTION=reverb
REVERB_APP_ID=********
REVERB_APP_KEY=********
REVERB_APP_SECRET=********
REVERB_HOST=127.0.0.1
REVERB_PORT=8090
REVERB_SCHEME=http
REVERB_SERVER_HOST=127.0.0.1
REVERB_SERVER_PORT=8090
VITE_REVERB_APP_KEY=********   # dibaca saat npm run build

# Kredensial tampilan
VITE_APP_NAME="TSC Vol 5"
```

> Rotasi kredensial S3/Reverb yang pernah terekspos di chat: ganti di panel penyedia,
> update `.env`, `config:cache`, `reload php-fpm`.

---

## 8. Database, migrasi & seeder

```bash
php artisan migrate --force                 # selalu --force di produksi
php artisan db:seed --class=Database\\Seeders\\TeamSeeder --force
php artisan db:seed --class=Database\\Seeders\\BracketSeeder --force   # idempoten
```

- **TeamSeeder** — 64 tim asli (32 SMA + 32 SMP), tanpa singkatan/grup (diisi via drawing UI).
  Idempoten via `updateOrCreate` nama+kategori.
- **BracketSeeder** — skeleton 30 slot TBD (R16→QF→SF→F + PO perebutan juara 3) + tautan
  winner/loser. Idempoten: kategori yang sudah berslot dilewati; PO + tautan pecundang
  selalu dipastikan ada (`ensurePlayoff`).
- **Pairing R16 baku** (`BracketController::r16Sources()`):
  R16-1 A1–B2, R16-2 C1–D2, R16-3 E1–F2, R16-4 G1–H2,
  R16-5 H1–G2, R16-6 F1–E2, R16-7 D1–C2, R16-8 B1–A2.
- Jangan `migrate:fresh` di produksi (menghapus data turnamen).

---

## 9. Aturan bisnis penting

| Aturan | Implementasi |
|---|---|
| Pemenang otomatis | `advanceWinner()` saat finish (termasuk via penalti); hanya isi slot kosong |
| Pecundang ke PO | `advanceLoser()` (SF→PO-1); juara 3 = pemenang PO |
| Penalti | `penalty1/2` + flag `is_penalty`; seri wajib beda (validasi `different`) |
| Gol penalti ≠ top skor | Tipe `shootout_goal`/`shootout_miss` dikecualikan (`WHERE type='goal'`) |
| Own goal | Tipe `own_goal`, tampil di timeline/BAP, tidak masuk top skor |
| WO progresif | 3× panggilan (`wo_call`, +1 skor tiap tekan); panggilan ke-3 finish 3–0 + flag; tim datang = berhenti tekan, lanjut normal |
| Foul tim | Klik langsung (tanpa nama pemain); counter per tim per babak, reset tiap kelipatan **6** + ganti babak; kolom `period` di event |
| Seri wajib tuntas (gugur) | Finish laga knockout seri tanpa penalti penentu → **422** (`rejectUndecidedKnockout`); grup boleh seri |
| Anti tim ganda | Satu tim ≤ 1 slot per ronde (`rejectKnockoutDuplicate` + cek client) |
| Nama pemain kanonis | Ejaan disamakan ke roster (case-insensitive) saat simpan event; warning bila tak dikenal |
| Sinkron penalti↔event | Hook model: `shootout_goal` dibuat/dihapus/ubah ⇄ skor penalti; UI update optimistis |
| Klasemen | Poin → SG → GM → nama (`StandingsService::rows`) |
| Juara | 1st = pemenang final, 2nd = pecundang final, 3rd = pemenang PO |

---

## 10. Role & akun

| Role | Akses |
|---|---|
| `admin` | Semua + kelola akun + hapus (kecuali: tak bisa hapus diri / akun admin lain) |
| `operator` | Semua operasional turnamen (tim, laga, bracket, live) |
| `pubdok` | Hanya berita + galeri |

- Login di `/rahasiabosku` (route name `login` dipertahankan agar redirect auth ikut).
- Ganti password: `/profile` (route `password.update` aktif; **hapus akun dinonaktifkan** total — UI + `abort(403)`).

---

## 11. Storage S3

- Bucket `tsc-bucket`, direktori: `team-logos/`, `player-photos/`, `news-covers/`,
  `news-inline/`, `gallery/`, `site-logos/`, `site-backgrounds/`.
- Semua URL publik absolut (`https://s3.nevaobjects.id/tsc-bucket/...`) disimpan di DB
  (logo/settings) atau diturunkan dari path — tahan ganti kredensial.
- Perilaku endpoint yang sudah ditangani: `HEAD` kadang 403 + `GET`/`HEAD` basi sesaat
  setelah hapus (verifikasi hapus via listing, bukan `exists()`).

---

## 12. Realtime (WebSocket)

- Service `tsc-reverb` + proxy Nginx `wss://tsc-vol5.my.id/app/`.
- Channel publik `scores`, event `match.updated` (payload: laga + kedua tim + event).
  Dipicu: update skor live, mutasi event, ubah/buat jadwal.
- Klien (Echo): hero + section Skor publik, Live admin, detail laga (pengganti interval).
  Polling ringan tetap sebagai fallback bila socket putus + indikator koneksi di Live Control.
- Timer jam tetap estimasi lokal (1 dtk), resync tiap update.

---

## 13. Perintah verifikasi

```bash
# kesehatan umum
systemctl is-active tsc-reverb nginx php8.4-fpm mysql
curl -s -o /dev/null -w "%{http_code}\n" https://tsc-vol5.my.id/
# socket end-to-end (butuh node + key dari .env)
node -e "new (require('pusher-js'))(KEY,{wsHost:'tsc-vol5.my.id',wsPort:443,wssPort:443,forceTLS:true})..."
php artisan tinker --execute='App\Events\MatchUpdated::dispatch(App\Models\TournamentMatch::first());'
# S3 tulis-baca-hapus: lihat skrip /tmp (simulasi) atau via UI galeri
php artisan route:list --name=admin.gallery
```

---

## 14. Troubleshooting

| Gejala | Penyebab & solusi |
|---|---|
| Kode baru tak berefek | `systemctl reload php8.4-fpm` (OPcache) + `config:cache`/`route:cache`/`view:cache` |
| `419` saat POST | Token CSRF kedaluwarsa (login ulang); untuk multipart pakai alias `POST`, bukan PUT |
| Upload logo 500 `imagewebp(): Palette image not supported` | Sudah diperbaiki di trait (konversi truecolor + fallback). Bila muncul lagi, cek `storage/logs/laravel.log` |
| Foto yatim di S3 | Hapus selalu via controller (ikut hapus objek). Cek via listing prefix |
| Tarik bracket "0 terisi" | Skeleton hilang — jalankan `BracketSeeder`; baris bracket dikunci dari hapus di Jadwal |
| Slot ganda / seri tanpa penalti | Ditolak 422 otomatis; rapikan data manual yang telanjur ada |
| Toast merah tapi data terhapus | Update optimistis — cek pesan sebenarnya; refresh halaman |
| Socket mati | `systemctl status tsc-reverb`; fallback polling tetap jalan |
| Login gagal berulang | Throttle Breeze; tunggu 60 dtk. Password admin hanya bisa direset via tinker/`Hash::make` oleh pemegang server |

---

## 15. Git workflow

- Branch: `main` (stabil) dan `production` (yang jalan di VPS) — dijaga sama (`ff-only`).
- Alur rilis: kerja di `production` → `git add -A` → commit pesan jelas → push `production` + `main`.
- Push butuh Personal Access Token (`repo`) sebagai password; revoke token yang pernah terekspos di chat.
- Yang tidak ikut commit (ter-ignore): `.env`, `vendor/`, `node_modules/`, `public/build`, `public/hot`.
