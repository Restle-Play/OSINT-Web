# OSINTMichelin — Lab Hacking Web Restoran

Web app pemesanan restoran, statis murni (HTML/CSS/JS), sengaja dibuat punya celah keamanan buat latihan hacking pribadi. Semua "database"-nya cuma `localStorage`/`sessionStorage` di browser — gak ada backend beneran, jadi aman dites sepuasnya tanpa nyentuh server siapa pun.

## Struktur file
```
osintmichelin/
├── index.html   — struktur halaman
├── style.css    — tampilan
├── script.js    — logika app + "database" lokal
└── README.md    — ini
```
Tinggal push ke repo GitHub, lalu buka lewat GitHub Pages atau jalanin lokal (`index.html` langsung dibuka di browser, atau pakai `python3 -m http.server`).

## Cara masuk
- Login tamu: `1` / `11` dan `user2` / `22`
- Area staff/admin: ketik `#admin` di belakang URL (gak ada link-nya di UI, cari sendiri)

## Celah yang sengaja ditanam
Gak dikasih tau caranya satu-satu, cuma arahnya aja:

1. **Auth full client-side** — semua pengecekan login ada di JavaScript yang bisa dibaca langsung lewat view-source.
2. **Password "di-hash" pakai base64** — base64 itu encoding, bukan enkripsi, gampang dibalikin.
3. **Broken access control di `#admin`** — tampil-tidaknya panel admin cuma ditentukan satu value di `localStorage`, bukan session beneran.
4. **Pola bypass login klasik** — form login punya pengecekan naif yang bisa ditembus payload gaya SQL injection.
5. **Manipulasi harga** — harga yang dipakai pas klik "Add" dibaca langsung dari DOM, gak diverifikasi ulang ke sumber aslinya.
6. **IDOR di fitur lacak pesanan** — "Track an order" bisa narik pesanan siapa aja cuma modal ID, gak ada pengecekan kepemilikan.
7. **Stored XSS** — kolom catatan dapur dirender di panel admin tanpa di-escape.

## Reset lab
Semua state nyimpen di localStorage/sessionStorage browser, per-origin tempat file-nya dibuka. Reset: buka DevTools → Application → clear storage, atau gampangnya pakai jendela private/incognito baru.

## Catatan penting
Ini buat kamu tes ke copy app milikmu sendiri, di mesin/browser milikmu sendiri. Jangan arahkan tooling serangan ke deployment orang lain dari app ini, atau ke sistem yang bukan milikmu / belum ada izin buat ditesin.
