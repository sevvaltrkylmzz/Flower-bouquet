# Çiçek Gönder 💐

Sevdiğin birine link ile gönderebileceğin, CSS/SVG tabanlı animasyonlu bir çiçek buketi.
[Devansh-Singhal/send-a-bouquet](https://github.com/Devansh-Singhal/send-a-bouquet) projesinden
ilham alınmıştır; backend veya veritabanı kullanmadan, tamamen statik olarak çalışır.

## Nasıl çalışır?

1. Ana sayfada alıcının adını, kendi adını, mesajını ve bir çiçek temasını seçersin.
2. "Buketi Hazırla" dediğinde mesajın `data` parametresi içinde (base64) kodlanmış bir link üretilir.
3. Bu linki kopyalayıp gönderdiğin kişi açtığında, buket sahneye adım adım (sap → yaprak →
   çiçek → kağıt → kurdele) animasyonla gelir ve ardından mesaj kart halinde yazı yazma
   efektiyle belirir.

Hiçbir veri bir sunucuya kaydedilmez; her şey linkin kendisinde taşınır.

## Çalıştırma

Statik bir sitedir, derleme gerektirmez:

```bash
# herhangi bir statik sunucu ile
npx serve .
# veya
python3 -m http.server 8000
```

Sonra tarayıcıda `index.html`'i aç.

## GitHub Pages ile yayınlama

Repo ayarlarından **Settings → Pages → Branch: main / root** seçilerek birkaç saniyede
yayına alınabilir; üretilen linkler o zaman `https://<kullanici>.github.io/Flower-bouquet/?data=...`
şeklinde paylaşılabilir hale gelir.

## Dosyalar

- `index.html` – oluşturma ve sunum ekranlarının işaretlemesi
- `style.css` – çiçek/sap/kağıt/kurdele animasyonları ve genel tasarım
- `script.js` – form, link kodlama/kod açma, buket oluşturma, yazı efekti
