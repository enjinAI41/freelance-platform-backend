# API Documentation

Related docs:
- [Project Report](./PROJECT_REPORT.md)
- [Development Notes](./DEVELOPMENT_NOTES.md)
- [README](../README.md)

## Moduller
- `auth`: kayit, giris, token yenileme
- `jobs`: is olusturma, listeleme, guncelleme
- `bids`: ise teklif verme ve teklif listeleme
- `projects`: proje olusturma/izleme, durum guncelleme, review islemleri
- `milestones`: kilometre tasi olusturma ve guncelleme
- `deliveries`: teslim olusturma ve revizyon talebi
- `payments`: odeme olusturma, release, refund
- `disputes`: itiraz olusturma, arabulucu atama, cozum
- `reports`: butce ve performans raporlari
- `health`: servis saglik kontrolu

## Endpoint Gruplari
- Auth: `/auth/*`
- Jobs/Bids: `/jobs/*`, `/jobs/:jobId/bids`
- Projects/Milestones: `/projects/*`, `/milestones/*`
- Deliveries/Payments: `/milestones/:id/deliveries`, `/payments/*`
- Disputes: `/projects/:projectId/disputes`, `/disputes/*`
- Reports/Health: `/reports/*`, `/health`

## Auth Akisi
1. `POST /auth/register` ile kullanici kaydi yapilir.
2. `POST /auth/login` ile access/refresh token alinir.
3. Korumali endpoint'lerde `Authorization: Bearer <token>` kullanilir.
4. Token yenileme akisi icin `POST /auth/refresh` endpoint'i kullanilir.

## Job Akisi
1. Isveren yeni bir is olusturur (`POST /jobs`).
2. Isler listeleme endpoint'i ile kesfedilir (`GET /jobs`).
3. Is detaylari ve durumlari uzerinden teklif toplama sureci ilerler.

## Bid Akisi
1. Freelancer secilen ise teklif verir (`POST /jobs/:jobId/bids`).
2. Isveren teklifleri gorur ve proje olusturma kararini verir.

## Project Akisi
1. Kabul edilen tekliften proje olusur.
2. Proje durumu endpoint'leri ile asamalar takip edilir.
3. Proje icinde milestone bazli teslim/odeme baglantisi kurulur.

## Milestone Akisi
1. `POST /projects/:projectId/milestones` ile milestone tanimlanir.
2. `PATCH /milestones/:id` benzeri endpoint'lerle durum/tarih/icerik guncellenir.

## Payment Akisi
1. Milestone veya proje bazli odeme kaydi olusturulur.
2. Sartlar saglandiginda release islemi uygulanir.
3. Uyumazlik veya iade durumunda refund sureci tetiklenir.

## Dispute Akisi
1. Proje taraflarindan biri itiraz olusturur.
2. Gerekirse arabulucu atanir.
3. Delil/degerlendirme sonrasi itiraz cozulur ve odeme akisi etkilenir.

## Swagger Kullanim Notu
Swagger UI adresi: [http://localhost:3002/docs](http://localhost:3002/docs)

Onerilen kullanim:
- Once `auth` endpoint'lerinden token alin.
- Swagger'daki `Authorize` butonu ile Bearer token ekleyin.
- Endpoint orneklerini sirasiyla cagirarak is akisini dogrulayin.
