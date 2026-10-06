# Tata Sprint Treker

Itinerary pasangan untuk perjalanan di Jogja, dibuat sebagai aplikasi web mobile-first dengan Next.js, TypeScript, dan Tailwind CSS.

## Menjalankan lokal

```bash
npm install
npm run dev
```

Lalu buka [http://localhost:3000](http://localhost:3000).

## Deploy di Vercel

Vercel otomatis mendeteksi proyek Next.js ini. Import repository, pilih framework **Next.js**, lalu gunakan pengaturan bawaan:

- Build Command: `npm run build`
- Install Command: `npm install`
- Output Directory: biarkan kosong

Tanpa konfigurasi Supabase, aplikasi tetap memakai jadwal lokal di browser.

## Supabase: jadwal bersama

1. Buat project Supabase. Buka **SQL Editor** lalu jalankan
   `supabase/migrations/202610060001_shared_trips.sql`.
2. Isi `.env` atau `.env.local` sesuai `.env.example` (tidak perlu membuat file kedua bila sudah ada):

   ```dotenv
   NEXT_PUBLIC_SUPABASE_URL=https://PROJECT_ID.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=isi_publishable_key_supabase
   ```

   Ambil URL dan publishable key dari dialog **Connect** / **Settings > API Keys**.
   Legacy anon JWT juga didukung lewat `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
   Tidak perlu secret key, service_role, password database, atau library Supabase tambahan.
   `.env` tidak masuk Git. Jangan pernah mengisi variabel `NEXT_PUBLIC_` dengan secret/service_role.
   Restart `npm run dev` setelah mengubah environment variables.
3. Tambahkan dua variabel yang sama di **Vercel > Project > Settings > Environment Variables**
   untuk lingkungan deployment yang dipakai, kemudian **redeploy**. Tidak diperlukan `vercel.json`.
4. Buka aplikasi dari perangkat yang berisi jadwal lama. Tekan **Bagikan** untuk memeriksa koneksi.
   Jika muncul pesan SQL belum terpasang, jalankan seluruh file SQL langkah 1 lalu tekan **Periksa koneksi lagi**.
   Setelah koneksi siap, tekan **Aktifkan jadwal bersama**.
   Jadwal, checklist, Plan B, rating, catatan, dan penjemputan diunggah bersama.
5. Salin link dari panel tersebut dan kirim ke Tata. Kedua perangkat harus memakai link yang sama.
   Membuka URL utama di perangkat baru tidak otomatis bergabung ke jadwal pribadi.

### Perilaku sinkronisasi

- Pemegang link dapat membaca **dan mengedit** seluruh jadwal. Link memiliki token acak
  256-bit yang disimpan dalam fragment URL; database hanya menyimpan hash token.
- API Next.js memvalidasi input, lalu memanggil fungsi database (RPC). Setiap fungsi baca/tulis
  memeriksa token di dalam database, termasuk bila dipanggil langsung menggunakan publishable key.
  Tabel memakai RLS tanpa akses langsung untuk `anon`/`authenticated`. Fungsi tidak mengembalikan hash token.
- Halaman aktif mengecek perubahan setiap 5 detik; perubahan lokal diunggah setelah jeda 700 ms.
  Ini polling, bukan Supabase Realtime. Tidak ada pekerjaan terjadwal atau notifikasi saat halaman ditutup.
- Jadwal lokal lama tetap disimpan dengan key yang sama. Cache jadwal bersama disimpan terpisah per trip.
  Link lama `?plan=` tetap dapat diimpor sebagai salinan lokal dan tidak menimpa trip bersama.
- Draft yang gagal terkirim tetap tersimpan dan dicoba kembali saat terhubung. Hindari membersihkan
  data browser sebelum perubahan terkirim; gunakan **Unduh cadangan jadwal** bila perlu.
- Jika dua perangkat mengubah versi yang sama, penyimpanan kedua mendapat HTTP 409.
  Aplikasi meminta pengguna mengunduh draft dan memuat versi terbaru sebelum mengulang perubahan.
  Tidak ada penimpaan otomatis atau penggabungan diam-diam.
- Menutup halaman dengan perubahan yang belum terkirim memunculkan peringatan browser.
- Fitur rencana rahasia/buka otomatis dan pemisahan pemilik–pengunjung **belum diimplementasikan**.
  Jangan menyimpan detail rahasia di jadwal bersama ini sebelum fitur hak akses tersebut dibuat.

### Endpoint backend

| Endpoint | Fungsi |
| --- | --- |
| `GET /api/sync/status` | Memeriksa konfigurasi dan koneksi RPC; mengembalikan `configured`, `ready`, `error` tanpa menampilkan key |
| `POST /api/trips` | Membuat jadwal dari `{ snapshot: { days, completedTasks } }` |
| `GET /api/trips/:id` | Membaca jadwal dengan header `Authorization: Bearer <token-link>` |
| `PATCH /api/trips/:id` | Menyimpan `{ snapshot, revision }` dengan token yang sama; konflik versi menghasilkan 409 |

Tidak ada endpoint untuk mendaftar semua trip. Request dibatasi ukurannya dan data divalidasi.
API/RPC pembuatan trip saat ini terbuka; sebelum penggunaan publik berskala besar, tambahkan
autentikasi dan kuota di database untuk mencegah pembuatan trip massal. Pembatasan di Vercel saja
tidak melindungi RPC Supabase yang dapat dipanggil langsung.

### Verifikasi

```bash
npm run typecheck
npm run test:backend
npm run build
```

Tes backend memakai transport Supabase tiruan untuk menguji handler API, validasi,
akses token, konflik versi, serta sinkronisasi saat jaringan terganggu. Tes ini tidak
menggantikan pengujian migrasi dan koneksi ke project Supabase asli.

Setelah akses tersedia, uji dengan dua browser: buat dan bagikan trip, ubah status jemput/checklist,
pastikan browser kedua menerima perubahan; lalu ubah kedua browser bersamaan untuk mengecek konflik.
Uji juga token salah (harus ditolak) dan kehilangan jaringan (draft harus tetap tersedia).

Referensi: [Fungsi database Supabase](https://supabase.com/docs/guides/database/functions),
[API keys Supabase](https://supabase.com/docs/guides/api/api-keys), dan
[Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security).
