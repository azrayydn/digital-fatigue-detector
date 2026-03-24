prd.md
# Ürün Gereksinim Dokümanı (PRD): FlowGuard AI

**Sürüm:** 1.0 (Web tabanlı MVP)  
**Durum:** Taslak / Geliştirme Öncesi  
**Geliştirici:** Azra Nur Aydın

---

## 1. Ürün Vizyonu ve Kapsamı
**FlowGuard AI**, bilgisayar başında çalışan bireylerin zihinsel yorgunluğunu, herhangi bir dış donanım gerektirmeden, yalnızca **klavye ve fare kullanım dinamiklerini** analiz ederek tespit eden bir Windows masaüstü asistanıdır.

### Temel Hedef:
Kullanıcının verimliliği düşmeden ve tükenmişlik (burnout) yaşamadan önce "sessiz yorgunluğu" tespit edip, yerinde mola önerileriyle bilişsel performansı optimize etmek.

---

## 2. Problem Tanımı
* **Fark Edilemeyen Yorgunluk:** Zihinsel yorgunluk sinsi ilerler; kullanıcı hata yapana kadar yorulduğunu anlamaz.
* **Statik Çözümlerin Yetersizliği:** Klasik "Pomodoro" sayaçları kullanıcının o anki gerçek enerji seviyesini bilmez, sadece zamana bakar.
* **Gizlilik Kaygıları:** Mevcut takip yazılımları veriyi buluta işler; FlowGuard AI ise veriyi tamamen yerelde (local) tutar.



## 3. Kullanıcı Kitlesi (Persona)
1. **Üniversite Öğrencileri:** Yoğun çalışma maratonlarında zihinsel enerjisini yönetmek isteyenler.
2. **Yazılımcılar & Mühendisler:** Odak (flow) halini korumak ve hata payını minimize etmek isteyenler.
3. **Ofis Çalışanları:** Gün boyu ekran başında olup "mental sis" yaşamadan günü bitirmek isteyen profesyoneller.



## 4. Teknik Gereksinimler (Faz 1: C# Engine)

### 4.1. Veri Toplama Modülü (Windows Hooks)
* **Teknoloji:** C# ile `LowLevelKeyboardProc` ve `LowLevelMouseProc` kullanılarak global dinleme yapılacaktır.
* **Klavye Metrikleri:** - **Latency:** İki tuş basışı arası süre (milisaniye).
    - **Error Rate:** Belirli bir zaman dilimindeki `Backspace` kullanım sıklığı.
* **Fare Metrikleri:** - **Jitter:** Fare imlecinin mikro-titremeleri ve hedefe giderken izlediği "kararsız" rotalar.
    - **Idle Time:** Çalışma sırasındaki mikro duraksamalar.

### 4.2. Yapay Zeka ve İşleme (ML.NET)
* **Baseline (Baz Hattı):** Kullanıcının ilk 60 dakikalık verisiyle "zinde profil" (normal hız ve doğruluk) oluşturulacaktır.
* **Anomali Tespiti:** ML.NET kullanılarak, mevcut yazım hızının baz hattından negatif sapması yorgunluk sinyali olarak kabul edilecektir.
* **Yerel İşleme:** Veriler asla internete çıkmaz; analiz kullanıcının kendi CPU/RAM'inde yapılır.



## 5. Uygulama Mimarisi (Ekranlar)

### 1. Ana Dashboard (WPF / WinUI)
- **Bilişsel Enerji Barı:** Dinamik, renk değiştiren pil göstergesi (%100 -> %0).
- **Durum Özeti:** "Odaklanmış", "Hafif Yorgun", "Kritik Eşik" etiketleri.
- **Hızlı Kontrol:** Takibi duraklatma/başlatma butonu.

### 2. Analiz ve İstatistikler
- **Yorgunluk Trendi:** Günlük enerji değişimini gösteren çizgi grafik.
- **Verimlilik Tablosu:** En verimli ve en yorgun olunan saatlerin analizi.

### 3. Ayarlar ve Gizlilik
- **Hassasiyet Ayarı:** AI'ın uyarı eşiğini (düşük/orta/yüksek) belirleme.
- **Kamera Opsiyonu:** Göz takibi için düşük çözünürlüklü yerel analiz izni.



## 6. Teknik Başarı Kriterleri (KPIs)
* **Kaynak Tüketimi:** Arka plan işlemi sırasında CPU kullanımı %1, RAM kullanımı 50MB altında olmalı.
* **Tepki Süresi:** Yorgunluk tespiti sonrası bildirim gecikmesi 5 saniyeyi geçmemeli.
* **Gizlilik:** Verilerin yerelde şifreli saklanması.



## 7. Gelecek Yol Haritası (Roadmap)
- [x] **Adım 1:** PRD Hazırlanması ve Teknoloji Seçimi (C#).
- [ ] **Adım 2:** Windows Hook yapısı ile klavye/fare dinleyicisinin yazılması.
- [ ] **Adım 3:** ML.NET ile basit bir regresyon modelinin eğitilmesi.
- [ ] **Adım 4:** WPF arayüzü ile verilerin görselleştirilmesi.