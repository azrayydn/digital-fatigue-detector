<<<<<<< HEAD
# FlowGuard AI — Basit Teknoloji Yığını (Başlangıç + Gemini)

Bu öneri, **başlangıç seviyesi** için mümkün olan en az araçla ilerlemenizi hedefler. **Gemini API** (Google AI Studio anahtarı) ile yapay zekâ özelliklerini eklemek üzerine kuruludur.

---

## Önerilen yığın (özet)

| Katman | Teknoloji | Ne işe yarar? |
|--------|-----------|----------------|
| Dil | **Python 3.11 veya 3.12** | Okuması ve yazması kolay; API örnekleri bol; tek komutla paket kurulur. |
| Gemini | **`google-genai`** (resmi SDK) | Google AI Studio / Gemini ile konuşmak için güncel istemci. |
| Gizli anahtar | **`python-dotenv`** + `.env` | API anahtarını koda yazmazsınız; güvenlik ve paylaşım kolaylaşır. |
| (İsteğe bağlı) Arayüz | **Streamlit** | Birkaç satırla basit panel/tablo; öğrenme eğrisi düşük. |

> **Not:** [prd.md](prd.md)’deki Windows **global hook** (tüm sistemde klavye/fare dinleme) ve tamamen **yerel ML** hedefi ileri seviyedir. Başlangıçta önce **manuel veya basit girdi** (ör. “şu an kaç dakikadır çalışıyorum?”) ile Gemini’den **mola önerisi / açıklama metni** almayı hedefleyebilirsiniz; hook ve yerel modeli sonraya bırakmak normaldir.

---

## Neden bu teknolojiler?

### Python
- Sözdizimi sade; hata ayıklamak ve örnek bulmak kolay.
- `pip` ile kütüphane eklemek tek satır.
- Gemini ve veri/ML örnekleri çoğunlukla Python ile anlatılır.

### Gemini API (Google AI Studio)
- Tek bir **API anahtarı** ile hızlıca deneme yaparsınız.
- Metin üretimi, özet, “şu durumda ne yapmalıyım?” gibi **kişiselleştirilmiş öneriler** için uygundur.
- Ücretsiz kotanız varsa öğrenme maliyeti düşük kalır.

### `google-genai` SDK
- Google’ın güncel resmi istemcisi; AI Studio dokümantasyonu ile uyumludur.
- İleride model veya özellik değişse de aynı ekosistemde kalırsınız.

### `python-dotenv` + `.env`
- Anahtarı GitHub’a yanlışlıkla gönderme riskini azaltır.
- Farklı bilgisayarlarda aynı kod, farklı `.env` ile çalışır.

### Streamlit (isteğe bağlı)
- HTML/CSS bilmeden küçük bir “dashboard” yaparsınız.
- İstemezseniz ilk aşamada sadece **terminalde çalışan bir `.py` dosyası** da yeterlidir.

---

## Kurulum adımları (Windows)

### 1. Python kurulumu
1. [https://www.python.org/downloads/](https://www.python.org/downloads/) adresinden **Python 3.11 veya 3.12** indirin.
2. Kurulumda **“Add python.exe to PATH”** seçeneğini işaretleyin.
3. Yeni bir **PowerShell** veya **cmd** penceresi açıp sürümü kontrol edin:

```powershell
python --version
```

`Python 3.11.x` veya `3.12.x` görmelisiniz.

### 2. Proje klasörü ve sanal ortam (önerilir)
Proje klasörünüzde (ör. `ai-project`):

```powershell
cd "C:\Users\<KullaniciAdi>\OneDrive\Belgeler\ai-project"
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

> PowerShell’de “execution policy” uyarısı alırsanız, yönetici olmadan genelde şu yeterli olur:  
> `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`

Sanal ortam aktifken komut satırının başında `(.venv)` benzeri bir ibare görünür.

### 3. Paketleri yükleme

```powershell
pip install --upgrade pip
pip install google-genai python-dotenv
```

Streamlit kullanacaksanız:

```powershell
pip install streamlit
```

İsterseniz bağımlılıkları dosyaya sabitleyin:

```powershell
pip freeze > requirements.txt
```

### 4. Google AI Studio API anahtarı
1. [Google AI Studio](https://aistudio.google.com/) ile giriş yapın.
2. **Get API key** ile anahtar oluşturun (hazırladığınız anahtarı kullanabilirsiniz).
3. Proje kökünde **`.env`** dosyası oluşturun (Git’e eklemeyin):

```env
GOOGLE_API_KEY=buraya_ai_studio_anahtariniz
```

`.gitignore` içinde `.env` satırı olduğundan emin olun.

### 5. Minimal test betiği
Proje içinde örneğin `test_gemini.py` oluşturup çalıştırın (kendi model adınızı AI Studio’daki öneriye göre güncelleyin; sık kullanılan: `gemini-2.0-flash` veya dokümantasyondaki güncel hızlı model):

```python
import os
from dotenv import load_dotenv
from google import genai

load_dotenv()
client = genai.Client(api_key=os.environ["GOOGLE_API_KEY"])

response = client.models.generate_content(
    model="gemini-2.0-flash",
    contents="Merhaba, kısa bir şekilde kendini tanıt.",
)
print(response.text)
```

Çalıştırma:

```powershell
python test_gemini.py
```

Cevap metni görünüyorsa API anahtarı ve kurulum doğru demektir.

### 6. (İsteğe bağlı) Streamlit ile tek sayfa
Örnek `app.py` ile:

```powershell
streamlit run app.py
```

---

## Sonraki adımlar (kısa)

1. PRD’deki **durumlar** (“Odaklanmış”, “Hafif Yorgun”, “Kritik”) için uygulama içinde basit kurallar veya sayaçlar kullanın; metin tabanlı **mola önerisini** Gemini’ye parametre olarak verin.
2. İleride Windows’ta klavye/fare verisi için PRD’deki **C# hook** yoluna geçebilir veya Python tarafında daha sınırlı ölçüm yöntemleri araştırabilirsiniz.
3. [tasks.md](tasks.md) maddelerini bu yığını seçtiyseniz “Python prototip + Gemini” alt başlıklarıyla güncellemeniz faydalı olur.

---

## Güvenlik hatırlatması

- API anahtarını **asla** public repoya koymayın.
- Üretimde kota ve maliyet için Google Cloud konsolundan kullanımı izleyin.
- Kullanıcıdan toplanacak **kişisel veya hassas davranış verisi** varsa PRD’deki **yerel saklama** taahhüdünü bozmamak için hangi verinin API’ye gideceğini bilinçli sınırlayın (ör. yalnızca özet metin, ham tuş dizisi göndermeme).

---

*Bu dosya öğrenme ve prototip odaklıdır; ürün büyüdükçe mimariyi (ör. ayrı servis, kimlik doğrulama) yeniden değerlendirebilirsiniz.*
=======
# FlowGuard AI — Basit Teknoloji Yığını (Başlangıç + Gemini)

Bu öneri, **başlangıç seviyesi** için mümkün olan en az araçla ilerlemenizi hedefler. **Gemini API** (Google AI Studio anahtarı) ile yapay zekâ özelliklerini eklemek üzerine kuruludur.

---

## Önerilen yığın (özet)

| Katman | Teknoloji | Ne işe yarar? |
|--------|-----------|----------------|
| Dil | **Python 3.11 veya 3.12** | Okuması ve yazması kolay; API örnekleri bol; tek komutla paket kurulur. |
| Gemini | **`google-genai`** (resmi SDK) | Google AI Studio / Gemini ile konuşmak için güncel istemci. |
| Gizli anahtar | **`python-dotenv`** + `.env` | API anahtarını koda yazmazsınız; güvenlik ve paylaşım kolaylaşır. |
| (İsteğe bağlı) Arayüz | **Streamlit** | Birkaç satırla basit panel/tablo; öğrenme eğrisi düşük. |

> **Not:** [prd.md](prd.md)’deki Windows **global hook** (tüm sistemde klavye/fare dinleme) ve tamamen **yerel ML** hedefi ileri seviyedir. Başlangıçta önce **manuel veya basit girdi** (ör. “şu an kaç dakikadır çalışıyorum?”) ile Gemini’den **mola önerisi / açıklama metni** almayı hedefleyebilirsiniz; hook ve yerel modeli sonraya bırakmak normaldir.

---

## Neden bu teknolojiler?

### Python
- Sözdizimi sade; hata ayıklamak ve örnek bulmak kolay.
- `pip` ile kütüphane eklemek tek satır.
- Gemini ve veri/ML örnekleri çoğunlukla Python ile anlatılır.

### Gemini API (Google AI Studio)
- Tek bir **API anahtarı** ile hızlıca deneme yaparsınız.
- Metin üretimi, özet, “şu durumda ne yapmalıyım?” gibi **kişiselleştirilmiş öneriler** için uygundur.
- Ücretsiz kotanız varsa öğrenme maliyeti düşük kalır.

### `google-genai` SDK
- Google’ın güncel resmi istemcisi; AI Studio dokümantasyonu ile uyumludur.
- İleride model veya özellik değişse de aynı ekosistemde kalırsınız.

### `python-dotenv` + `.env`
- Anahtarı GitHub’a yanlışlıkla gönderme riskini azaltır.
- Farklı bilgisayarlarda aynı kod, farklı `.env` ile çalışır.

### Streamlit (isteğe bağlı)
- HTML/CSS bilmeden küçük bir “dashboard” yaparsınız.
- İstemezseniz ilk aşamada sadece **terminalde çalışan bir `.py` dosyası** da yeterlidir.

---

## Kurulum adımları (Windows)

### 1. Python kurulumu
1. [https://www.python.org/downloads/](https://www.python.org/downloads/) adresinden **Python 3.11 veya 3.12** indirin.
2. Kurulumda **“Add python.exe to PATH”** seçeneğini işaretleyin.
3. Yeni bir **PowerShell** veya **cmd** penceresi açıp sürümü kontrol edin:

```powershell
python --version
```

`Python 3.11.x` veya `3.12.x` görmelisiniz.

### 2. Proje klasörü ve sanal ortam (önerilir)
Proje klasörünüzde (ör. `ai-project`):

```powershell
cd "C:\Users\<KullaniciAdi>\OneDrive\Belgeler\ai-project"
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

> PowerShell’de “execution policy” uyarısı alırsanız, yönetici olmadan genelde şu yeterli olur:  
> `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`

Sanal ortam aktifken komut satırının başında `(.venv)` benzeri bir ibare görünür.

### 3. Paketleri yükleme

```powershell
pip install --upgrade pip
pip install google-genai python-dotenv
```

Streamlit kullanacaksanız:

```powershell
pip install streamlit
```

İsterseniz bağımlılıkları dosyaya sabitleyin:

```powershell
pip freeze > requirements.txt
```

### 4. Google AI Studio API anahtarı
1. [Google AI Studio](https://aistudio.google.com/) ile giriş yapın.
2. **Get API key** ile anahtar oluşturun (hazırladığınız anahtarı kullanabilirsiniz).
3. Proje kökünde **`.env`** dosyası oluşturun (Git’e eklemeyin):

```env
GOOGLE_API_KEY=buraya_ai_studio_anahtariniz
```

`.gitignore` içinde `.env` satırı olduğundan emin olun.

### 5. Minimal test betiği
Proje içinde örneğin `test_gemini.py` oluşturup çalıştırın (kendi model adınızı AI Studio’daki öneriye göre güncelleyin; sık kullanılan: `gemini-2.0-flash` veya dokümantasyondaki güncel hızlı model):

```python
import os
from dotenv import load_dotenv
from google import genai

load_dotenv()
client = genai.Client(api_key=os.environ["GOOGLE_API_KEY"])

response = client.models.generate_content(
    model="gemini-2.0-flash",
    contents="Merhaba, kısa bir şekilde kendini tanıt.",
)
print(response.text)
```

Çalıştırma:

```powershell
python test_gemini.py
```

Cevap metni görünüyorsa API anahtarı ve kurulum doğru demektir.

### 6. (İsteğe bağlı) Streamlit ile tek sayfa
Örnek `app.py` ile:

```powershell
streamlit run app.py
```

---

## Sonraki adımlar (kısa)

1. PRD’deki **durumlar** (“Odaklanmış”, “Hafif Yorgun”, “Kritik”) için uygulama içinde basit kurallar veya sayaçlar kullanın; metin tabanlı **mola önerisini** Gemini’ye parametre olarak verin.
2. İleride Windows’ta klavye/fare verisi için PRD’deki **C# hook** yoluna geçebilir veya Python tarafında daha sınırlı ölçüm yöntemleri araştırabilirsiniz.
3. [tasks.md](tasks.md) maddelerini bu yığını seçtiyseniz “Python prototip + Gemini” alt başlıklarıyla güncellemeniz faydalı olur.

---

## Güvenlik hatırlatması

- API anahtarını **asla** public repoya koymayın.
- Üretimde kota ve maliyet için Google Cloud konsolundan kullanımı izleyin.
- Kullanıcıdan toplanacak **kişisel veya hassas davranış verisi** varsa PRD’deki **yerel saklama** taahhüdünü bozmamak için hangi verinin API’ye gideceğini bilinçli sınırlayın (ör. yalnızca özet metin, ham tuş dizisi göndermeme).

---

*Bu dosya öğrenme ve prototip odaklıdır; ürün büyüdükçe mimariyi (ör. ayrı servis, kimlik doğrulama) yeniden değerlendirebilirsiniz.*
>>>>>>> c271fa7 (First working version)
