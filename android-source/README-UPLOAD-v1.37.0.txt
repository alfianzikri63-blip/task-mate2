TaskMate Android v1.37.0 — SOURCE LENGKAP (BUKAN APK TERBUILD)

Sumber: TaskMate resmi v1.36.0 dari aset APK debug build serta patch produksi terbaru.
Fitur: kamera sampai 10 foto dalam 1 sesi; hapus antrean; Simpan Semua dengan timestamp per foto;
Galeri Terpusat di Laporan: foto tugas umum, checklist shift, rak dan Map Do It.

CARA UPLOAD: Ekstrak ZIP. Upload isi folder ZIP ke ROOT repository Task-new
https://github.com/alfianwahyu035-boop/Task-new
Ganti file yang sama, jangan hapus repository atau keystore/signing secrets.
Pastikan file dan folder nested benar: .github/workflows, scripts, icons, android-icons, android-sounds.
Lalu GitHub Actions -> Release Signed TaskMate APK -> Run workflow.
Rilis v1.37.0 belum dibuat hingga workflow tersebut SUKSES.

Catatan: Setelah rilis, release workflow memperbarui apk-update.json ke v1.37.0 mandatory=true.
Source ZIP ini sengaja membiarkan metadata update menunjuk rilis resmi sebelumnya
(v1.36.0) supaya versi yang belum diterbitkan tidak terlihat sebagai APK siap unduh.
Cara update tetap instal APK signed di atas aplikasi lama, jangan uninstall.

Penting: Library Gradle/npm harus diunduh pertama kali secara online pada GitHub Actions.
Android native folder www/ dan android/ di-generate oleh npm run android:init.
Semua 15 ikon original disalin dari APK resmi untuk mempertahankan identitas TaskMate.
Tidak mengubah database atau bucket Supabase, semua foto privat & aturan RLS tetap berlaku.
Tes dari sini: node --check app.js && npm install && npm run android:init
