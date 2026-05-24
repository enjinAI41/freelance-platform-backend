# Development Notes

## Kurulum Notlari
- `.env` dosyasini `.env.example` uzerinden olusturun.
- Bagimliliklari `npm install` ile kurun.
- Prisma istemcisini `npm run prisma:generate` ile olusturun.
- Migration'lari `npm run prisma:migrate` ile calistirin.

## Docker Notlari
- Servisleri ayaga kaldirmak icin: `docker compose up -d`
- Durum kontrolu icin: `docker compose ps`
- Docker tarafinda MySQL port eslemesi `3307` olarak kullanilmaktadir.

## Node Surumu Uyarisi
- Node.js `20.x LTS` kullanimi onerilir.
- Daha eski surumlerde Nest/Prisma arac zinciri uyumsuzluklari gorulebilir.

## Bilinen Riskler
- Tam kapsayici test suiti olmadigindan regresyon riski bulunur.
- Odeme/itiraz gibi kritik alanlarda is kurallari yuksek dikkat gerektirir.
- Uretim ortami guvenlik ayarlari (secret rotation, policy tuning) ek calisma gerektirebilir.

## Gelistirici Icin Oneriler
- Yeni endpoint eklerken DTO validation ve Swagger annotationlarini birlikte guncelleyin.
- Prisma migration dosyalarini anlamli ve atomik tutun.
- Modul bazli sorumluluk ayrimini koruyun; ortak davranislari `src/common` altinda toplayin.
- Pull request oncesi en azindan lint, migration ve Swagger acilis kontrolu yapin.
