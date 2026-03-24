# FlowGuard AI — Basit Kullanıcı Akışı

Bu akış, [prd.md](prd.md)’de tanımlanan Windows masaüstü uygulaması (ana ekran, analiz, ayarlar) ile uyumludur.

---

## İlk kullanım (uygulama ilk kez açıldığında)

1. **Uygulamayı açma** — Kullanıcı FlowGuard AI’ı başlatır (görev çubuğu veya masaüstü kısayolu).
2. **İlk ekran** — Ana **Dashboard** açılır: **bilişsel enerji barı**, kısa bir **durum özeti** (“Öğreniliyor…” veya “Baz çizgisi oluşturuluyor” benzeri metin) ve **takibi duraklat / başlat** kontrolü görünür.
3. **Arka planda toplama** — Kullanıcı normal şekilde klavye ve fare kullanmaya devam eder; uygulama (izin verildiyse) **Windows hook** ile kullanım dinamiklerini **yerelde** toplar. Veri internete gönderilmez.
4. **Baz hattı süresi** — Yaklaşık **ilk 60 dakika** boyunca sistem, kullanıcının “zinde” profilini (normal yazım hızı ve davranış özeti) oluşturur. Bu süreçte enerji göstergesi kademeli veya tahmine dayalı güncellenebilir; kullanıcıya “kalibrasyon” hissi verilir.
5. **Sonuç** — 60 dakika tamamlandığında baseline kaydedilir; bundan sonra mevcut davranış, bu profile göre karşılaştırılır ve **“Odaklanmış” / “Hafif Yorgun” / “Kritik Eşik”** gibi durumlar anlamlı hale gelir.

---

## Günlük kullanım (uygulama alışkın kullanıcıda)

6. **Uygulamayı açma** — Dashboard’da **enerji barı** ve **anlık durum etiketi** (ör. “Odaklanmış”) hemen görünür; takip varsayılan olarak **açık** olabilir veya kullanıcı son oturumdaki tercihi görür.
7. **Çalışma** — Kullanıcı kod yazar, belge düzenler veya tarayıcı kullanır; FlowGuard arka planda metrikleri günceller. Kullanıcı ekstra bir şey yapmak zorunda değildir.
8. **Yorgunluk sinyali** — Model, mevcut kullanımın baz hattına göre **anomali** (ör. yazım ritminde belirgin düşüş) tespit ederse durum **“Hafif Yorgun”** veya **“Kritik Eşik”**e kayar.
9. **Bildirim ve öneri** — Kısa süre içinde (hedef: **5 saniye içinde**) kullanıcıya **bildirim** veya uygulama içi uyarı gelir; **mola / dinlenme** önerisi sunulur (PRD’nin “yerinde mola” hedefi).
10. **Sonuç** — Kullanıcı molayı alırsa ritim düzelebilir ve enerji göstergesi toparlanır; almazsa uyarı tekrarlanabilir veya eşik ayarına göre davranış değişir.

---

## Kullanıcının bilinçli müdahaleleri

11. **Takibi duraklatma** — Kullanıcı **“Duraklat”**a basar; özel aktivite (toplantı, oyun, başkasının bilgisayarı) sırasında veri toplanmaz veya yanlış öğrenme oluşmaz. **“Başlat”** ile izleme yeniden açılır.
12. **Analiz ekranı** — Kullanıcı **Analiz / İstatistikler**’e geçer; **günlük enerji trendi** (çizgi grafik) ve **en verimli / en yorgun saatler** tablosunu görür. Sonuç: kendi ritmini fark eder, günü planlamayı kolaylaştırır.
13. **Ayarlar** — Kullanıcı **hassasiyeti** (düşük / orta / yüksek) değiştirir; daha az veya daha çok uyarı alır. İsteğe bağlı **kamera / göz takibi** izni (ileri özellik) burada yönetilebilir.
14. **Uygulamayı kapatma** — Pencere kapatıldığında veya sistem tepsisine alındığında politika ürüne göre belirlenir; veriler **yerelde şifreli** kalır, buluta çıkmaz.

---

## Özet (tek bakışta)

| Adım | Kullanıcı ne yapar? | Ne görür / ne olur? |
|------|---------------------|----------------------|
| Aç | Uygulamayı başlatır | Dashboard, enerji barı, durum |
| Çalış | Normal bilgisayar kullanır | Arka planda yerel analiz |
| Uyarı | (İsteğe bağlı) molaya gider | Bildirim + öneri, durum güncellenir |
| Duraklat | Özel durumlarda duraklatır | Toplama kesilir; tekrar başlatılabilir |
| İncele | Analiz sayfasına bakar | Grafik ve saat bazlı özet |
| Ayarla | Hassasiyeti değiştirir | Uyarı sıklığı/eşiği değişir |

---

*Bu doküman ürün taslağı içindir; gerçek uygulama metinleri ve ekran sırası geliştirme sırasında netleştirilebilir.*
