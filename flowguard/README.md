# FlowGuard AI v2.0

Gerçek zamanlı odak ve üretkenlik takip uygulaması.

## Kurulum

```bash
pip install flask
python main.py
```

Tarayıcıda `http://127.0.0.1:5000` adresini aç.

## Ne Değişti (v2.0)

### Backend
- **Gerçek skor motoru** (`src/engine/tracker.py`): Kullanıcı davranışından dinamik hesaplama
  - Aktif/boşta periyot oranı (0–60 puan)
  - Dakika başına tuş vuruşu bonusu (0–30 puan)
  - Fare hareketi bonusu (0–10 puan)
  - Uzun oturum yorgunluk penaltısı (45+ dk sonra devreye girer)
- **Yeni `/activity` endpoint'i**: Frontend'den 5 saniyede bir aktivite verisi alır
- **`fatigue_warning` durumu**: Skor < 20 ve 5+ dakika geçtiyse otomatik uyarı

### Frontend
- **Gerçek aktivite izleme**: `keydown`, `mousemove`, `click` olayları sayılıp backend'e gönderilir
- **Dinamik odak skoru**: Her 5 saniyede gerçek davranışa göre değişir
- **Canlı oturum zamanlayıcısı**: Başlatıldığında gerçek zamanlı sayar
- **Progress bar + SVG ring**: Skor animasyonlu görsel gösterge
- **Bağlam duyarlı AI yorumu**: Skora ve yorgunluğa göre farklı tavsiyeler
- **Dark mode UI**: Modern, kontrast odaklı tasarım

### Düzeltilen Hatalar
- Skor sabit `%72` değil, kullanıcıya göre gerçekten değişiyor
- Butonlar devre dışıyken bile durum sayfa yenilemede doğru güncelleniyor
- Notice kutusu boşken görünmez hale geldi (alan kaplamıyor)
- Tüm metrikler birbirleriyle tutarlı
