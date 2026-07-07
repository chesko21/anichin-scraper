# 🎬 DonghuaNest

Platform streaming dan katalog donghua subtitle Indonesia yang dibangun menggunakan Next.js, TypeScript, dan Tailwind CSS.

![Next.js](https://img.shields.io/badge/Next.js-15-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4-38bdf8)
![License](https://img.shields.io/badge/License-MIT-green)

## ✨ Fitur

* 🔍 Pencarian donghua secara real-time
* 🔥 Daftar donghua trending
* ⭐ Rekomendasi berdasarkan rating
* 📚 Koleksi donghua lengkap
* 🎭 Filter berdasarkan genre
* 📱 Responsive untuk desktop dan mobile
* ⚡ Infinite loading & pagination
* 🇮🇩 Subtitle Indonesia
* 🌙 Modern dark UI
* 🚀 Optimasi performa Next.js

---

## 🛠️ Tech Stack

### Frontend

* Next.js
* React
* TypeScript
* Tailwind CSS
* Lucide React

### Backend/API

* Next.js API Routes
* REST API

---

## 🚀 Instalasi

Clone repository:

```bash
git clone https://github.com/username/donghuanest.git
```

Masuk ke folder project:

```bash
cd donghuanest
```

Install dependencies:

```bash
npm install
```

atau

```bash
pnpm install
```

atau

```bash
yarn install
```

Jalankan development server:

```bash
npm run dev
```

Buka browser:

```bash
http://localhost:3000
```

---

## ⚙️ Environment Variables

Buat file:

```env
.env.local
```

Contoh:

```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
API_BASE_URL=https://your-api-url.com
```

---

## 📸 Fitur Utama

### Trending Donghua

Menampilkan donghua yang sedang populer berdasarkan data terbaru.

### Recommendation System

Menampilkan donghua dengan rating tertinggi.

### Search Engine

Pencarian cepat berdasarkan:

* Judul
* Genre
* Keyword

### Genre Filter

Mendukung berbagai genre:

* Action
* Adventure
* Fantasy
* Cultivation
* Romance
* Martial Arts
* Historical
* Mystery
* Horror
* Sci-Fi
* dan lainnya

---

## 📈 Optimasi

* Lazy Loading
* Infinite Scroll
* Image Optimization
* Pagination
* Dynamic Rendering
* Responsive Layout
* SEO Friendly

---

## 🚀 Deployment ke Vercel

### Masalah Umum & Solusi

#### ❌ Data tidak tampil di production

**Penyebab:**
1. **Cache in-memory tidak persisten** - Vercel serverless functions bersifat stateless, cache Map akan reset setiap request
2. **Request paralel terlalu banyak** - 8 request sekaligus bisa trigger timeout
3. **Timeout Vercel** - Batas waktu eksekusi function (10-60 detik)
4. **Keterbatasan jaringan** - Vercel mungkin membatasi koneksi ke domain target

**Solusi yang sudah diterapkan:**
- ✅ Timeout wrapper di semua API routes (25 detik)
- ✅ Sequential fetch di homepage (bukan paralel)
- ✅ Error handling yang lebih informatif
- ✅ Fallback data ketika API gagal

#### 🔧 Rekomendasi Deployment

1. **Gunakan Vercel Hobby/Pro** - Dapatkan batas timeout lebih tinggi
2. **Tambahkan caching eksternal** - Redis/Memcached untuk cache persisten
3. **Kurangi jumlah halaman awal** - Hanya fetch 2 halaman pertama
4. **Monitor logs** - Cek Vercel Functions logs untuk debug

#### 📊 Monitoring

Untuk memantau performa, buka Vercel dashboard dan cek:
- Function execution time
- Error rate
- Memory usage

---

## 🧪 Build Production

```bash
npm run build
```

Jalankan production:

```bash
npm start
```

---

## 📄 License

MIT License

---

## ❤️ Support

Jika project ini bermanfaat, jangan lupa berikan ⭐ pada repository GitHub.