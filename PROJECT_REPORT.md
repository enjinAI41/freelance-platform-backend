# Proje Raporu

## Proje Ozeti
Bu proje, freelance platformu icin gelistirilen bir backend ve frontend uygulamasidir. Temel amac, is ilanlari, teklifler, projeler, odemeler ve anlasmazliklar gibi is akislarini tek bir platformda yonetmektir.

## 9.4. Gorev Paylasimi ve Proje Gelistirme Sureci
Proje gelistirme surecinde, her ekip uyesinin uzmanlik alanina ve projenin gereksinimlerine gore detayli bir is bolumu yapilmistir. Koordinasyon, kodlama ve test asamalari asagidaki sekilde dagitilmistir:

| Ekip Uyesi | Gorev ve Sorumluluk Alanlari |
| --- | --- |
| Engincan Koc | Backend Mimari & Full-Stack: Veritabani tasariminin (ERD) koda dokulmesi, REST API servislerinin yazilmasi, is kurallarinin backend tarafinda dogrulanmasi ve frontend entegrasyonu. |
| Berat Cakir | UI/UX Tasarimi & Frontend: Figma/Wireframe tasarimlarinin hazirlanmasi, kullanici arayuzlerinin (Dashboard, Proje Detay, Odeme Takibi vb.) React tabanli gelistirilmesi ve kullanici deneyiminin iyilestirilmesi. |
| Sena Bostan | QA & Hata Ayiklama: Fonksiyonel testlerin yapilmasi, mantiksal hatalarin raporlanmasi ve sistem kararliligi icin bug duzeltmeleri. |
| Emine Iclal Oguz | Test Muhendisligi & Dokumantasyon: Edge case senaryolarinin test edilmesi, hata toleransinin olculmesi ve teknik dokumantasyon kontrolu. |

## 10. Teknik Uygulama ve Gelistirme Notlari
Bu bolumde, projenin kodlama asamasinda uygulanan temel yaklasimlar ozetlenmektedir.

### 10.1. Backend ve Veri Yonetimi (Engincan Koc)
- Iliskisel mimari: Proje, normalize edilmis veritabani yapisi (kullanicilar, projeler, isler, teslimler, odemeler, anlasmazliklar vb.) uzerine kurulmustur.
- Guvenlik: Kullanici kimlik dogrulama akislari JWT tabanli olarak kurgulanmis, sifreler guvenli sekilde hashlenmistir.
- Is mantigi: Odeme kaydinin, teslim ve onay adimlari tamamlanmadan olusmamasi gibi kritik is kurallari backend tarafinda dogrulanmistir.

### 10.2. Arayuz ve Kullanici Deneyimi (Berat Cakir & Engincan Koc)
- Dashboard mimarisi: Musteri, Freelancer ve Hakem rolleri icin farkli paneller tasarlanmis ve rol bazli veri gosterimi saglanmistir.
- Dosya yonetimi: Freelancer teslimleri icin dosya yukleme akisi entegre edilmis, musterilerin bu ciktilari inceleyebilmesi saglanmistir.
- Kullanici deneyimi: Is ilanlari, teklif, proje ve odeme sayfalarinda akislar sade ve tutarli hale getirilerek kullanilabilirlik artirilmistir.

### 10.3. Test ve Kararlilik (Sena Bostan & Emine Iclal Oguz)
- Hata ayiklama: Es zamanli kullanici islemlerinde veri tutarliligini korumaya yonelik testler yapilmis ve form validasyonlari guclendirilmistir.
- Sonuc: Anlasmazlik cozumu, proje teslim ve odeme takip modullerinin beklenen senaryolarda dogru calistigi dogrulanmistir.
