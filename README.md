# Proje Adı

Freelance Platform Backend

## Proje Açıklaması

Freelance Platform Backend, freelance pazar yeri iş akışlarını yönetmek için geliştirilmiş NestJS + Prisma tabanlı bir API projesidir. Projede kimlik doğrulama, iş ilanları, teklifler, proje yürütme, kilometre taşları, teslimler, ödemeler, anlaşmazlıklar ve raporlama süreçleri yer almaktadır.

Projede ayrıca React tabanlı bir frontend arayüzü bulunmaktadır. Backend, frontend ve MySQL servisleri Docker Compose ile birlikte çalıştırılabilecek şekilde düzenlenmiştir.

## Projenin Amacı

Bu projenin amacı, freelance platformu için rol bazlı iş akışlarını yönetebilen, modüler yapıda geliştirilmiş ve yerel ortamda kolay kurulabilir bir uygulama sunmaktır. Proje tesliminde değerlendiricinin sistemi daha kolay inceleyebilmesi için API dokümantasyonu, ekran görüntüleri, Docker kurulumu ve teknik rapor dosyaları ayrıca düzenlenmiştir.

## Kullanılan Teknolojiler

- Node.js
- NestJS
- Prisma ORM
- MySQL
- React
- Vite
- Swagger (OpenAPI)
- Docker / Docker Compose
- ESLint

## Özellikler

- JWT tabanlı kimlik doğrulama
- Rol bazlı yetkilendirme
- İş ilanı oluşturma ve listeleme
- Teklif gönderme ve teklif akışları
- Proje yaşam döngüsü yönetimi
- Kilometre taşı takibi
- Teslim ve revizyon süreçleri
- Ödeme serbest bırakma ve iade işlemleri
- Anlaşmazlık oluşturma, atama ve çözümleme
- Dashboard odaklı raporlama endpointleri
- Swagger/OpenAPI üzerinden API inceleme
- Docker Compose ile backend, frontend ve MySQL servislerini birlikte çalıştırma

## Klasör Yapısı

```text
.
|-- src/
|   |-- common/
|   |-- modules/
|   `-- prisma/
|-- prisma/
|   |-- migrations/
|   |-- schema.prisma
|   `-- seed.ts
|-- scripts/
|-- docs/
|-- screenshots/
|   |-- customer/
|   |-- freelancer/
|   |-- referee/
|   `-- system/
|-- frontend/
|   |-- public/
|   `-- src/
|       |-- api/
|       |-- components/
|       |-- context/
|       |-- layouts/
|       |-- pages/
|       |-- routes/
|       `-- types/
|-- eslint.config.js
|-- docker-compose.yml
`-- README.md
```

## Kurulum Adımları

Gerekli araçlar:

- Node.js 20.x LTS
- npm 10+
- Docker Desktop
- Docker Compose v2+

Yerel ortam değişkenleri için `.env.example` dosyasından `.env` dosyası oluşturulabilir:

```bash
cp .env.example .env
```

Projede kullanılan temel ortam değişkenleri:

- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `PORT`

Backend bağımlılıklarını kurmak için:

```bash
npm install
```

Prisma Client oluşturmak için:

```bash
npm run prisma:generate
```

Veritabanı migration işlemleri için:

```bash
npm run prisma:migrate
```

Frontend bağımlılıklarını kurmak için:

```bash
cd frontend
npm install
```

## Çalıştırma Adımları

Backend, frontend ve MySQL servislerini Docker Compose ile çalıştırmak için:

```bash
docker compose up -d
```

Servis durumunu kontrol etmek için:

```bash
docker compose ps
```

Yerel portlar:

- Backend API: `3002`
- Frontend: `5174`
- MySQL: `3307`

Swagger UI adresi:

- [http://localhost:3002/docs](http://localhost:3002/docs)

Frontend adresi:

- [http://localhost:5174](http://localhost:5174)

Backend geliştirme modunda çalıştırmak için:

```bash
npm run start:dev
```

Frontend geliştirme modunda çalıştırmak için:

```bash
cd frontend
npm run dev
```

## Veritabanı ve Prisma

Kullanılabilecek Prisma komutları:

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

Şema dosyası: `prisma/schema.prisma`

Migration dosyaları: `prisma/migrations/*`

## API Dokümantasyonu

Swagger UI aşağıdaki adresten açılabilir:

- [http://localhost:3002/docs](http://localhost:3002/docs)

Swagger üzerinden DTO şemaları, endpoint sözleşmeleri ve auth gereksinimleri incelenebilir.

Örnek endpointler:

```http
POST /auth/register
POST /auth/login
GET  /jobs
POST /jobs/:jobId/bids
GET  /projects
POST /projects/:projectId/milestones
POST /milestones/:id/deliveries
POST /payments/:id/release
POST /projects/:projectId/disputes
GET  /health
```

## Doğrulama ve Test

Önerilen doğrulama akışı:

```bash
docker compose up -d
npm run prisma:generate
npm run prisma:migrate
npm run start:dev
```

Kontrol edilebilecek noktalar:

- Swagger `http://localhost:3002/docs` adresinde açılmalıdır.
- Health endpoint yanıt vermelidir: `GET /health`
- Temel modül akışları Swagger üzerinden denenebilir.

Kullanılabilir doğrulama komutları:

- `npm run build`: backend build işlemi
- `npm run start:dev`: backend geliştirme modu
- `npm run lint`: backend kaynak kodunu ESLint ile kontrol eder
- `npm run prisma:generate`: Prisma Client oluşturur
- `npm run prisma:migrate`: migration işlemlerini çalıştırır
- `npm run prisma:seed`: veritabanı seed işlemini çalıştırır
- `npm run test:integration:delivery-payment`: teslim/ödeme entegrasyon senaryosu

Mevcut test kapsamı sınırlıdır. Otomatik testler ağırlıklı olarak hedefli entegrasyon doğrulama scriptleriyle desteklenmektedir.

## Ekran Görüntüleri

### Freelancer Paneli

![Freelancer Panel 01](./screenshots/freelancer/freelancer-panel-01.png)
![Freelancer Panel 02](./screenshots/freelancer/freelancer-panel-02.png)
![Freelancer Panel 03](./screenshots/freelancer/freelancer-panel-03.png)
![Freelancer Panel 04](./screenshots/freelancer/freelancer-panel-04.png)
![Freelancer Panel 05](./screenshots/freelancer/freelancer-panel-05.png)
![Freelancer Panel 06](./screenshots/freelancer/freelancer-panel-06.png)

### Müşteri Paneli

![Customer Panel 01](./screenshots/customer/customer-panel-01.png)
![Customer Panel 02](./screenshots/customer/customer-panel-02.png)
![Customer Panel 03](./screenshots/customer/customer-panel-03.png)
![Customer Panel 04](./screenshots/customer/customer-panel-04.png)
![Customer Panel 05](./screenshots/customer/customer-panel-05.png)
![Customer Panel 06](./screenshots/customer/customer-panel-06.png)
![Customer Panel 07](./screenshots/customer/customer-panel-07.png)
![Customer Panel 08](./screenshots/customer/customer-panel-08.png)
![Customer Panel 09](./screenshots/customer/customer-panel-09.png)
![Customer Panel 10](./screenshots/customer/customer-panel-10.png)

### Hakem Paneli

![Referee Panel 01](./screenshots/referee/referee-panel-01.png)
![Referee Panel 02](./screenshots/referee/referee-panel-02.png)
![Referee Panel 03](./screenshots/referee/referee-panel-03.png)
![Referee Panel 04](./screenshots/referee/referee-panel-04.png)
![Referee Panel 05](./screenshots/referee/referee-panel-05.png)
![Referee Panel 06](./screenshots/referee/referee-panel-06.png)

### Sistem Doğrulama Görselleri

Sistem doğrulama görselleri `screenshots/system/` klasörü altında tutulabilir:

- `docker-compose-status.png`
- `swagger-api.png`
- `frontend-preview.png`

## Dokümantasyon Bağlantıları

- [Proje Raporu](./PROJECT_REPORT.md)
- [Docs Proje Raporu](./docs/PROJECT_REPORT.md)
- [API Dokümantasyonu](./docs/API_DOCUMENTATION.md)
- [Geliştirme Notları](./docs/DEVELOPMENT_NOTES.md)

## Bilinen Eksikler

- CI/CD pipeline yapılandırması henüz bulunmamaktadır.
- Otomatik test kapsamı sınırlıdır.
- Üretim ortamı için secret rotation, gözlemlenebilirlik ve gelişmiş rate policy gibi konular genişletilebilir.

## Geliştirme Önerileri

- Unit, integration ve e2e test kapsamı artırılabilir.
- CI workflow eklenebilir.
- Audit logging, metrics ve tracing desteği geliştirilebilir.
- Ödeme ve anlaşmazlık süreçleri için daha fazla edge-case senaryosu eklenebilir.
- Deployment manifestleri ve ortam geçiş stratejisi hazırlanabilir.

## Katkıda Bulunanlar

- [enjinAI41](https://github.com/enjinAI41)

## Lisans

Bu depoda `LICENSE` dosyası bulunmaktadır. Yeniden dağıtım veya ticari kullanım öncesinde lisans dosyası incelenmelidir.
