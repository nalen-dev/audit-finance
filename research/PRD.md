# Product Requirements Document (PRD)
## OripioFin - Personal Finance Audit Application

### 1. Tujuan Produk
Membangun aplikasi audit keuangan pribadi (OripioFin) yang modern, ringan, dan cepat, ditujukan untuk mencatat pemasukan dan pengeluaran harian pengguna. Aplikasi ini memiliki fitur unggulan berupa pencatatan cepat via Lock Screen Widget (Android) dan pelacakan anggaran (*budget tracking*) komprehensif di Web Dashboard.

### 2. Tech Stack (Tahap Awal)
*   **Web Frontend:** React + Vite, TailwindCSS (Tampilan modern, dark mode natural).
*   **Mobile App:** Kotlin Native + Jetpack Compose (Untuk menjamin performa lock screen widget yang mulus).
*   **Backend API:** Go (Golang) (Kinerja tinggi dan hemat sumber daya).
*   **Database:** PostgreSQL (Relasional, cocok untuk transaksi keuangan yang butuh konsistensi tinggi).

### 3. Fitur Utama (MVP)

#### 3.1. Autentikasi & Akun
*   **Login & Registrasi:** Pengguna dapat mendaftar menggunakan Email dan Password.
*   **Keamanan Data:** Sistem menggunakan JWT (JSON Web Tokens) untuk autentikasi API.
*   **Sinkronisasi Lintas Platform:** Karena tersentralisasi di backend Go, data di Web dan Mobile App 100% tersinkron secara *real-time*.

#### 3.2. Fitur "Multi-Wallet" (Banyak Dompet/Rekening)
*   **Definisi:** Pengguna dapat membuat lebih dari satu dompet (misal: "BCA", "Gopay", "Uang Tunai").
*   **Fungsi:** 
    *   Setiap dompet memiliki saldo masing-masing.
    *   Saldo keseluruhan (Total Balance) akan dihitung dari akumulasi semua dompet.
    *   Saat melakukan input transaksi, pengguna diwajibkan memilih sumber dompet.

#### 3.3. Manajemen Kategori Transaksi
*   **Default Categories:** Sistem menyediakan kategori bawaan saat akun dibuat.
    *   *Pengeluaran:* Makanan, Transportasi, Utilitas, Belanja, Hiburan.
    *   *Pemasukan:* Gaji, Bonus, Investasi.
*   **Personalisasi:** Pengguna dapat menambah, mengedit (nama & ikon/warna), atau menghapus kategori kustom mereka sendiri.

#### 3.4. CRUD Pencatatan Transaksi
*   **Input Pengeluaran & Pemasukan:** Field yang tersedia meliputi Nominal (Wajib), Kategori (Wajib), Dompet/Rekening (Wajib), Tanggal (Wajib), dan Catatan (Opsional).
*   **Riwayat (History):** Tabel/List yang menampilkan semua transaksi. Terdapat fitur filter berdasarkan rentang waktu, dompet, dan kategori.

#### 3.5. Target Anggaran (Budgeting) & Analitik
*   **Pengaturan Budget:** Pengguna dapat mengatur target maksimal pengeluaran berdasarkan durasi:
    *   Target Harian
    *   Target Mingguan
    *   Target Bulanan
*   **Overspending Alerts:** Jika pengeluaran telah mencapai 80% dari target, indikator akan berubah warna menjadi peringatan (kuning/merah).
*   **Dashboard Web:** Menampilkan analitik visual (seperti grafik donat untuk pembagian kategori, dan *trend line* pemasukan vs pengeluaran).

#### 3.6. Fitur Khusus Android: Lock Screen Widget (Quick Expense)
*   **Akses Cepat:** Widget diletakkan di *Home Screen* atau *Lock Screen* Android.
*   **Numpad Virtual:** Pengguna bisa mengetikkan nominal tanpa membuka aplikasi utama.
*   **Quick Select:** Terdapat daftar kategori dan dompet default atau terakhir yang dipakai untuk mempercepat proses.
*   **One-Tap Save:** Saat "Save" ditekan, data langsung dikirim ke *background service* untuk disinkronisasi.

### 4. Rencana Implementasi Database (Gambaran Awal)
*   `Users`: (id, email, password_hash, created_at)
*   `Wallets`: (id, user_id, name, type, balance)
*   `Categories`: (id, user_id, name, icon, type, is_default)
*   `Transactions`: (id, user_id, wallet_id, category_id, amount, type, date, note)
*   `Budgets`: (id, user_id, category_id_or_null, period_type, target_amount)

### 5. Panduan Desain Visual (UI/UX)
*   **Tema Utama:** Dark Mode yang natural dan *clean* (referensi desain: *OripioFin*).
*   **Warna:** Menghindari warna neon artifisial, lebih memilih warna palet alami (hijau forest untuk elemen positif/tombol utama, abu-abu tua untuk *background*, teks dengan kontras putih lembut).
*   **Tipografi:** Modern, *sans-serif* yang sangat terbaca untuk angka dan tabel laporan keuangan.
