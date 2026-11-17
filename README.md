# TaskMate v1.37.0 — Kamera multi-foto & galeri terpusat

Source resmi yang disesuaikan dari **Task-new** (Android) dan **Task-mate** (website) per 15 November 2026. `app.js`, `index.html`, `styles.css`, `themes.css`, `sw.js`, `v137-features.css`, dan ikon website pada kedua paket adalah sama. Source lama dan data pada Supabase tidak dihapus.

## Yang baru di v1.37.0

- **Kamera multi-foto 1–10 jepretan dalam satu sesi**, dengan preview, hapus foto antrean, ambil ulang, dan **Simpan Semua**.
- Foto rak tetap melalui **crop**; setiap foto mendapat timestamp dari saat kamera mengambil jepretan, bukan saat pengiriman.
- Pengiriman dilakukan **satu foto per satu foto** memakai endpoint/tabel foto yang sudah ada. Jika satu unggahan gagal, foto yang belum diunggah tetap ada dalam sesi sehingga dapat diulang; foto yang sudah berhasil tidak dikirim ulang.
- Tab baru **Galeri** berisi foto tugas umum, checklist shift, Sisir Harga, dan Map Do It, dengan filter tanggal, shift, jenis, PIC dan ekspor JPG grid (maks. 12 gambar per JPG, dibagi otomatis jika lebih banyak).
- Tidak mengunggah foto dari galeri HP sebagai bukti: tetap wajib memakai kamera asli di aplikasi, HTTPS/izin kamera, dan audit timestamp.

## Keamanan dan data

- **Tidak ada migrasi SQL, tabel tambahan, atau pemindahan data Supabase**. Bucket Storage tetap privat: `task-evidence`, `shift-evidence`, dan `shift-extra-evidence`.
- Galeri hanya membaca foto sesuai hak akses Supabase RLS. Karyawan difilter untuk hanya melihat foto yang diunggah akunnya; Admin Tim dapat melihat foto tim sesuai izin RLS.
- Signed URL gambar berumur pendek; dokumen foto asli tidak disalin ke GitHub atau disimpan lagi sebagai galeri publik.
- Galeri memuat data berdasarkan tanggal pilihan; untuk menjaga performa, setiap kueri utama membatasi 1.000 baris. Jika sangat banyak, pilih tanggal lebih spesifik.
- `config.js` hanya berisi publishable key yang memang ditujukan ke browser. Jangan memasukkan service_role, keystore, atau password ke repo publik.
- Jadwal shift, push/pengingat lokal Android, pembaruan APK wajib, nama package Android, semua tema, ikon kustom, dan laporan sebelumnya tetap dipertahankan.

## Catatan dan keterbatasan

- Antrean foto yang **belum berhasil dikirim hanya berada di RAM sesi kamera**; menutup aplikasi atau kamera akan menghilangkannya. Simpan sebelum keluar.
- Penggabungan grid dilakukan lokal dalam bentuk JPG yang diunduh, tidak mengganti foto asli.
- Galeri menampilkan foto yang tercatat dalam tabel Supabase. Jika foto di Storage belum mempunyai catatan database, tidak akan tampil.
- Menampilkan status terunggah membutuhkan sinkronisasi Cloud. Jaringan tetap diperlukan untuk upload foto dan melihat galeri lintas perangkat.
- **Push sungguhan saat aplikasi ditutup** tetap memerlukan FCM/Web Push server; pengingat lokal Android tetap terjaga, website hanya dapat membunyikan pengingat saat halaman aktif.

## Pengujian yang disarankan setelah dipasang

1. Masuk menggunakan akun tim. Buka pekerjaan lalu Kamera → ambil 3 foto, Tambah foto setelah masing-masing foto pertama dan kedua → Simpan Semua. Pastikan tiga foto tampil di galeri pekerjaan.
2. Buka Sisir Harga dan uji crop foto, lalu Map Do It dengan nama rak; ambil lebih dari satu foto tanpa menutup kamera.
3. Aktifkan mode pesawat sesaat saat upload kedua (jika lingkungan uji memungkinkan). Pastikan foto yang belum terkirim dapat dicoba ulang tanpa pengiriman duplikat.
4. Buka menu Galeri, pilih tanggal kerja, filter jenis, shift, dan PIC; unduh JPG grid dan periksa folder Download.
5. Uji akun Admin dan Karyawan terpisah, pastikan karyawan tidak melihat foto orang lain dan tidak dapat mengubah foto historis.
6. Cek kembali ikon launcher TaskMate, semua tema, fitur foto laporan/PDF lama, pengingat shift, dan notifikasi wajib update.

Lihat panduan khusus dalam ZIP APK atau website untuk pemasangan masing-masing.
