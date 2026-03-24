# FlowGuard AI — Geliştirme Görev Listesi

Bu liste [prd.md](prd.md) (**FlowGuard AI**, Faz 1: C# Engine — Windows masaüstü) ile hizalıdır. Maddeleri tamamladıkça işaretleyin.

---

## Faz 0 — Proje ve mimari hazırlık

- [x] PRD hazırlanması ve teknoloji seçimi (C#) — *PRD Bölüm 7, Adım 1*
- [ ] Çözüm yapısı: WPF (veya WinUI) istemci + isteğe bağlı ayrı sınıf kütüphanesi (hook/motor)
- [ ] Hedef .NET sürümü ve NuGet bağımlılıkları (ML.NET vb.) sabitlensin
- [ ] Katmanlar netlensin: **Hook toplama → metrik hesaplama → baseline/ML → UI/bildirim** (veri akışı diyagramı)
- [ ] README: kurulum, çalıştırma, mimari özet (yerel işleme, veri buluta gitmez)

---

## Faz 1 — Windows Hook veri toplama modülü (PRD §4.1)

- [ ] **Adım 2 (yol haritası):** `LowLevelKeyboardProc` ile global klavye dinleyicisi
  - [ ] İki tuş basışı arası süre (**latency**, ms) ölçümü ve zaman penceresine biriktirme
  - [ ] Belirli zaman diliminde **Backspace** sıklığı → **error rate** metriği
- [ ] `LowLevelMouseProc` ile global fare dinleyicisi
  - [ ] **Jitter:** imleç mikro-titremesi / hedefe giderken kararsız rota için ham veya türetilmiş sinyal
  - [ ] **Idle time:** çalışma sırası mikro duraksamalarının tespiti
- [ ] Hook yaşam döngüsü: başlat/durdur, uygulama kapanışında kaynakları serbest bırakma
- [ ] Yönetici izni / güvenlik notları (global hook gereksinimleri) dokümante edilsin

---

## Faz 2 — Metrik birleştirme ve yerel kalıcılık

- [ ] Zaman penceresi stratejisi (ör. kayan pencere, günlük toplulaştırma) tanımlansın
- [ ] Ham olaylardan PRD metriklerine dönüşüm için tek bir “feature” veya özet modeli
- [ ] **Gizlilik (PRD §4.2, §6):** veriler yalnızca yerelde; kalıcı depoda **şifreleme** (PRD KPI)
- [ ] Baseline için ham/özet veri saklama formatı (ilk 60 dakika verisi hazır olacak şekilde)

---

## Faz 3 — Baseline ve ML.NET (PRD §4.2)

- [ ] **Baz hattı:** kullanıcının ilk **60 dakika** verisiyle “zinde profil” oluşturma akışı
- [ ] **Adım 3 (yol haritası):** ML.NET ile basit **regresyon** / sapma modeli
  - [ ] Eğitim verisi: baseline sonrası güncellemeler (isteğe bağlı online uyarlama kararı)
  - [ ] Mevcut yazım hızı (veya eşdeğer özet) baz hattına göre **negatif sapma** → yorgunluk sinyali
- [ ] Anomali/eşik mantığı: durum sınıfları ile bağlantı (“Odaklanmış”, “Hafif Yorgun”, “Kritik Eşik” — PRD §5.1)
- [ ] **Yerel işleme:** ağ çağrısı yok; doğrulama için kod incelemesi veya telemetri kapalı mod

---

## Faz 4 — Durum motoru ve bildirimler

- [ ] Sürekli skor → PRD durum etiketleri eşlemesi
- [ ] **Hassasiyet (PRD §5.3):** düşük / orta / yüksek eşik ayarının modele veya son katmana bağlanması
- [ ] Yorgunluk tespiti sonrası kullanıcı bildirimi (Windows toast veya uygulama içi)
- [ ] **KPI — Tepki süresi:** tespit ile bildirim arası **≤ 5 saniye** (ölçüm ve gerekirse iyileştirme)

---

## Faz 5 — WPF / WinUI arayüzü (PRD §5)

- [ ] **Adım 4 (yol haritası):** ana kabuk ve sayfa/navigasyon yapısı
- [ ] **1. Ana Dashboard**
  - [ ] Bilişsel enerji **pil barı** (%100 → %0, dinamik renk)
  - [ ] Durum özeti metni: Odaklanmış / Hafif Yorgun / Kritik Eşik
  - [ ] **Hızlı kontrol:** takibi duraklat / başlat
- [ ] **2. Analiz ve İstatistikler**
  - [ ] Günlük enerji trendi — **çizgi grafik**
  - [ ] En verimli / en yorgun saatler — **tablo veya özet**
- [ ] **3. Ayarlar ve Gizlilik**
  - [ ] AI uyarı eşiği (düşük/orta/yüksek)
  - [ ] **Kamera / göz takibi (opsiyonel):** düşük çözünürlük yerel analiz izni — *MVP sonrası veya bayraklı özellik olarak planlansın*

---

## Faz 6 — Performans ve kalite (PRD §6 KPI)

- [ ] **CPU:** arka planda hedef **~%1** (profil ile ölçüm; gerekirse örnekleme aralığı ayarı)
- [ ] **RAM:** hedef **50 MB altı** (bellek profili, gereksiz kopyaların azaltılması)
- [ ] Hook + ML + UI birlikte stabilite testi (uzun oturum, uyku/uyanma senaryoları)
- [ ] Birim testleri: metrik hesaplama, baseline geçişleri, eşik mantığı (mümkün olan katmanlarda)

---

## Faz 7 — Paketleme ve teslim

- [ ] Windows için dağıtım (ör. MSIX, tek exe veya kurulum sihirbazı) ve imzalama stratejisi
- [ ] Gizlilik metni: verinin yerelde kaldığı, şifreleme özeti
- [ ] Bilinen sınırlamalar ve PRD **Bölüm 7** sonraki adımlar (kamera vb.) güncellensin

---

## PRD yol haritası ile hızlı eşleme

| PRD Adım | Bu dosyadaki karşılık |
|----------|------------------------|
| Adım 1 — PRD | Faz 0 (tamamlandı) |
| Adım 2 — Hook | Faz 1 |
| Adım 3 — ML.NET | Faz 3 (+ Faz 2 veri hazırlığı) |
| Adım 4 — WPF | Faz 5 (+ Faz 4 bildirim) |

---

*Son güncelleme: PRD sürüm 1.0 ile senkron.*
