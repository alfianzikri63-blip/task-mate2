TASKMATE - SOURCE ANDROID UNTUK UPLOAD MANUAL
=============================================
Paket ini disusun dari full source APK v1.37.0 milik proyek, ditambah patch APK v1.37.1.
Paket ini merupakan rekonstruksi source kerja, bukan salinan byte-for-byte seluruh commit repository lama.
Berkas generated www/ tidak disalin karena dibuat ulang otomatis lewat scripts/prepare-web.mjs.

LANGKAH UNGGAH (REPOSITORY BARU task-mate2)
1. Ekstrak ZIP ini di HP/komputer.
2. Buka repository task-mate2 dan buat folder android-source/.
3. Upload file dan folder DI DALAM android-source/ pada ZIP ke folder
   android-source/ di GitHub, dengan struktur subfolder tetap.
4. JANGAN TIMPA index.html, app.js, styles.css, atau config.js di root repo: 
   root saat ini adalah website yang telah online.
5. Source Android tidak langsung menjadi APK. Workflow build harus
   dikonfigurasi terpisah untuk bekerja dari direktori android-source/.

PENTING: folder .github di dalam android-source tidak aktif sebagai workflow
GitHub Actions; hanya .github/workflows di ROOT repository yang dieksekusi.
Backend Supabase existing tetap dipakai. Jangan memasukkan secret/server key.
