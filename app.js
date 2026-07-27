// =============================================================================
// AKIŞ İSTASYONU — app.js
// Bu dosyada SADECE Pomodoro sayaç mantığını yazıyoruz.
// Mikser (ses kaydırıcıları) bölümüne şimdilik hiç dokunmuyoruz.
// =============================================================================


// -----------------------------------------------------------------------
// 1) DOM ELEMANLARINI SEÇME
// -----------------------------------------------------------------------
// document.querySelector(), sayfada verdiğimiz CSS seçiciye uyan İLK 
// elemanı bulur ve bize bir "referans" verir. Bu referansı bir değişkene 
// atadığımızda, o elemanı JS içinden okuyabilir/değiştirebiliriz.
//
// Neden bunları en üstte, tek tek seçiyoruz? Çünkü her butona tıklanışta 
// tekrar tekrar querySelector çağırmak hem gereksiz yere yavaş hem de 
// okunabilirliği bozar. Elemanı BİR KEZ bulup değişkende sakladığımızda, 
// kodun geri kalanında o değişkeni tekrar tekrar, ucuza kullanırız.

const minutesDisplay = document.querySelector('#timer-minutes');
const secondsDisplay = document.querySelector('#timer-seconds');
const startPauseBtn = document.querySelector('#btn-start-pause');
const resetBtn = document.querySelector('#btn-reset');
const progressFill = document.querySelector('.progress-fill');

// querySelectorAll, verilen seçiciye uyan TÜM elemanları bulur ve bize 
// bir NodeList (dizi benzeri bir yapı) döndürür. querySelector'dan farkı: 
// o sadece İLK eşleşeni getirirken, bu HEPSİNİ getirir. 3 ses satırımızın 
// (Yağmur, Kafe, Şömine) hepsini tek satırda, tek seferde yakalıyoruz; 
// ileride bunların üzerinde forEach ile tek tek dolaşacağız.
const soundRows = document.querySelectorAll('.sound-row');


// -----------------------------------------------------------------------
// 2) UYGULAMA DURUMU (STATE)
// -----------------------------------------------------------------------
// Bu değişkenleri neden fonksiyonların İÇİNDE değil, dosyanın en üstünde,
// "global" (dış) alanda tanımlıyoruz?
//
// Çünkü bir fonksiyon içinde `let` ile tanımlanan bir değişken, sadece o 
// fonksiyon çalıştığı sürece yaşar; fonksiyon bittiği anda hafızadan silinir.
// Bizim sayacımızda ise birden fazla fonksiyon (başlat, duraklat, sıfırla, 
// her saniye tetiklenen "tick") AYNI veriye (kalan süre, çalışıyor mu?) 
// erişip onu güncellemek zorunda. Eğer bu değişkenler bir fonksiyonun 
// içinde hapsolsaydı, diğer fonksiyonlar bu veriyi göremezdi.
//
// Bu yüzden "ortak, paylaşılan durum"u dosyanın en tepesinde, tüm 
// fonksiyonların erişebileceği bir yerde tutuyoruz. Buna kısaca 
// "state" (durum) yönetimi denir; küçük uygulamalarda bu şekilde birkaç 
// global değişkenle yönetilir, büyüdükçe daha gelişmiş yapılara evrilir.

// Odaklanma süresi olarak 25 dakikayı SANİYE cinsinden tutuyoruz (25 * 60).
// Süreyi doğrudan saniye olarak tutmak, geri sayarken "her saniye 1 azalt" 
// gibi çok basit bir işlem yapmamızı sağlıyor; dakika/saniyeyi ekranda 
// göstermeden hemen önce, sadece updateDisplay() içinde hesaplıyoruz.
const FOCUS_DURATION_IN_SECONDS = 25 * 60; // 1500 saniye

let remainingSeconds = FOCUS_DURATION_IN_SECONDS; // Şu an kalan süre
let isRunning = false;                            // Sayaç şu an çalışıyor mu?
let intervalId = null;                             // setInterval'in kimlik numarası


// -----------------------------------------------------------------------
// 3) EKRANI GÜNCELLEME: updateDisplay()
// -----------------------------------------------------------------------
// Bu fonksiyonun tek görevi: `remainingSeconds` değişkenindeki saniyeyi 
// alıp, "AA:BB" formatında ekrana yazmak. Başka hiçbir şeye karışmıyor 
// (sayaç durdurmuyor, süre azaltmıyor) — bu prensibe "tek sorumluluk" 
// (single responsibility) denir; her fonksiyon tek bir iş yapmalı ki 
// hem anlaşılması hem de ileride hata ayıklaması kolay olsun.
function updateDisplay() {
    // Toplam saniyeyi dakika ve saniyeye bölüyoruz.
    // Math.floor(): ondalık kısmı atıp tam sayıya yuvarlar (aşağı yuvarlama).
    // Örnek: remainingSeconds = 125 ise -> 125 / 60 = 2.08 -> Math.floor = 2 dakika
    const minutes = Math.floor(remainingSeconds / 60);

    // % (modulo/kalan) operatörü, bir bölme işleminden ARTA KALANI verir.
    // Örnek: 125 % 60 = 5 (çünkü 125 saniye = 2 dakika + 5 saniye artık)
    const seconds = remainingSeconds % 60;

    // padStart(2, '0'): Bir metni SOLDAN, istenen uzunluğa (2 karakter) 
    // ulaşana kadar verilen karakterle ('0') doldurur.
    // Örnek: "5".padStart(2, '0') -> "05"   |   "12".padStart(2, '0') -> "12" (zaten 2 karakter, değişmez)
    // Sayıyı String()'e çevirmemizin sebebi: padStart bir METİN (string) 
    // fonksiyonudur, sayılar (number) üzerinde doğrudan çalışmaz.
    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSeconds = String(seconds).padStart(2, '0');

    // textContent kullanıyoruz, innerHTML DEĞİL. Aradaki fark önemli:
    // - innerHTML, verdiğiniz metni HTML olarak YORUMLAR. Yani içine 
    //   yanlışlıkla "<b>" gibi bir etiket ya da kullanıcıdan gelen 
    //   güvenilmeyen bir veri girerse, tarayıcı onu gerçek bir HTML 
    //   etiketi gibi çalıştırır. Bu hem güvenlik açığı (XSS) yaratabilir 
    //   hem de tarayıcının HTML'i yeniden ayrıştırmasına (parse) neden 
    //   olduğu için daha yavaştır.
    // - textContent ise verdiğiniz şeyi HER ZAMAN düz metin olarak yazar, 
    //   yorumlamaz. Biz burada sadece rakam yazdığımız için innerHTML'e 
    //   hiç ihtiyacımız yok; textContent hem daha güvenli hem daha hızlı 
    //   olduğu için doğru tercih bu.
    minutesDisplay.textContent = formattedMinutes;
    secondsDisplay.textContent = formattedSeconds;
}


// -----------------------------------------------------------------------
// 3.1) İLERLEME ÇUBUĞUNU GÜNCELLEME: updateProgressBar()
// -----------------------------------------------------------------------
// Mantık: "Kalan yüzde = kalan süre / toplam süre * 100"
// Örnek: 1500 saniyelik sürenin 750'si kaldıysa -> 750 / 1500 * 100 = %50
// Sayaç ilerledikçe remainingSeconds küçülür, dolayısıyla bu oran da 
// küçülür ve çubuk gitgide "boşalır" (genişliği azalır).
function updateProgressBar() {
    const percentageRemaining = (remainingSeconds / FOCUS_DURATION_IN_SECONDS) * 100;

    // element.style.width: Bir DOM elemanının CSS "width" özelliğine 
    // JavaScript'ten DOĞRUDAN müdahale etmemizi sağlar. Bu satır, 
    // tarayıcının arka planda şunu yapmasıyla eşdeğerdir:
    //   .progress-fill { width: 50%; }
    // Yani style.css dosyasına hiç dokunmadan, o elemana ait ANLIK, 
    // satır-içi (inline) bir stil kuralı ekliyoruz.
    //
    // Neden sadece bir sayı (50) değil de "%50" (yüzde işaretiyle, bir 
    // METİN) veriyoruz? Çünkü CSS'te "width" bir BİRİM ister — px, %, 
    // rem gibi. JavaScript'e "50" yazarsak tarayıcı bunun hangi birimde 
    // olduğunu bilemez ve stili görmezden gelir. Bu yüzden template 
    // literal (backtick `` ` `` işaretleri) kullanarak sayıyı "%" 
    // birimiyle birleştirilmiş bir metne çeviriyoruz: `${sayı}%`
    progressFill.style.width = `${percentageRemaining}%`;
}


// -----------------------------------------------------------------------
// 4) HER SANİYE ÇALIŞACAK FONKSİYON: tick()
// -----------------------------------------------------------------------
// setInterval her tetiklendiğinde bu fonksiyon çalışacak. Görevi:
// süreyi 1 azaltmak, ekranı güncellemek ve süre bittiyse sayacı durdurmak.
function tick() {
    remainingSeconds--; // remainingSeconds = remainingSeconds - 1 ile aynı

    updateDisplay();
    updateProgressBar();

    // Süre sıfıra ulaştıysa (ya da bir şekilde altına düştüyse) sayacı durdur.
    if (remainingSeconds <= 0) {
        stopTimer();
        remainingSeconds = 0;
        updateDisplay();
        // İleride buraya "bildirim sesi çal" veya "Mola moduna otomatik geç" 
        // gibi bir mantık ekleyebiliriz; bu adım için henüz o kısma dokunmuyoruz.
    }
}


// -----------------------------------------------------------------------
// 5) SAYACI BAŞLATMA: startTimer()
// -----------------------------------------------------------------------
// setInterval(fonksiyon, milisaniye): Verilen fonksiyonu, belirtilen 
// milisaniye aralığıyla SONSUZA KADAR tekrar tekrar çalıştırır. 
// Burada 1000 milisaniye = 1 saniye verdiğimiz için, tick() fonksiyonu 
// her saniye bir kez tetiklenecek.
//
// setInterval() bize geriye bir "kimlik numarası" (ID) döndürür. Bu ID'yi 
// mutlaka bir değişkende (intervalId) saklamalıyız; çünkü bu ID olmadan 
// bu spesifik zamanlayıcıyı DURDURAMAYIZ. clearInterval() fonksiyonu, 
// "hangi zamanlayıcıyı durduracağını" bu ID sayesinde anlar.
function startTimer() {
    isRunning = true;

    intervalId = setInterval(tick, 1000);

    // Kullanıcıya geri bildirim: buton artık "Duraklat" desin ki, 
    // sayacın şu an aktif olarak çalıştığını anlasın.
    startPauseBtn.textContent = 'Duraklat';
}


// -----------------------------------------------------------------------
// 6) SAYACI DURAKLATMA: stopTimer()
// -----------------------------------------------------------------------
// clearInterval(id): setInterval ile başlatılmış bir zamanlayıcıyı, 
// verilen ID'ye bakarak durdurur. ID'yi vermezsek (ya da yanlış ID 
// verirsek) tarayıcı hangi zamanlayıcıyı durduracağını bilemez.
function stopTimer() {
    isRunning = false;

    clearInterval(intervalId);

    // Butonun metnini "Devam Et" yapıyoruz ki kullanıcı sayacın 
    // duraklatıldığını, sıfırlanmadığını anlasın.
    startPauseBtn.textContent = 'Devam Et';
}


// -----------------------------------------------------------------------
// 7) BAŞLAT/DURAKLAT BUTONU: "TOGGLE" MANTIĞI
// -----------------------------------------------------------------------
// "Toggle" (anahtar) mantığı basittir: mevcut duruma BAKIP tam tersini 
// yaparız. isRunning true ise durdur, false ise başlat. Bu sayede TEK 
// bir buton, TEK bir event listener ile hem "Başlat" hem "Duraklat" 
// görevini üstlenebiliyor.
//
// addEventListener('click', fonksiyon): Butona tıklandığında verilen 
// fonksiyonu çalıştırmasını tarayıcıya söylüyoruz. Fonksiyonu isim 
// vererek değil (örn. toggleTimer() gibi ÇAĞIRARAK değil), REFERANS 
// olarak (toggleTimer, parantezsiz) veriyoruz. Çünkü parantez koyarsak 
// fonksiyon sayfa yüklenir yüklenmez HEMEN çalışır; biz ise "tıklandığı 
// ANDA çalışsın" istiyoruz.
function toggleTimer() {
    if (isRunning) {
        stopTimer();
    } else {
        startTimer();
    }
}

startPauseBtn.addEventListener('click', toggleTimer);


// -----------------------------------------------------------------------
// 8) SIFIRLA BUTONU: resetTimer()
// -----------------------------------------------------------------------
function resetTimer() {
    // Önce çalışan bir zamanlayıcı varsa onu durduruyoruz. Bu adımı 
    // atlarsak, kullanıcı sayaç ÇALIŞIRKEN "Sıfırla"ya bastığında, 
    // arka planda eski setInterval çalışmaya devam eder ve süre 25 
    // dakikaya döndükten hemen sonra tekrar azalmaya başlar — bu da 
    // gözle görülür bir hataya (bug) yol açar.
    stopTimer();

    // Süreyi başa, 25 dakikaya döndürüyoruz.
    remainingSeconds = FOCUS_DURATION_IN_SECONDS;
    updateDisplay();

    // remainingSeconds artık FOCUS_DURATION_IN_SECONDS'a EŞİT olduğu için 
    // updateProgressBar() içindeki oran otomatik olarak 100/100 = %100 
    // çıkacak; yani çubuk sıfırlanınca tekrar tamamen dolu görünecek.
    updateProgressBar();

    // stopTimer() butonu "Devam Et" yapmıştı; ama sıfırladıktan sonra 
    // aslında hiç başlamamış bir sayaçtayız, bu yüzden metni tekrar 
    // "Başlat" olarak düzeltiyoruz.
    startPauseBtn.textContent = 'Başlat';
}

resetBtn.addEventListener('click', resetTimer);


// -----------------------------------------------------------------------
// 9) SAYFA İLK AÇILDIĞINDA
// -----------------------------------------------------------------------
// Sayfa ilk yüklendiğinde ekranda zaten HTML'den gelen statik "25:00" 
// yazısı görünüyor olsa da, updateDisplay()'i burada bir kez çağırmak 
// bize şu garantiyi veriyor: ekranda görünen değer HER ZAMAN 
// remainingSeconds değişkeninden TÜRETİLMİŞ olacak; HTML'deki statik 
// metne değil, gerçek JS durumuna güveneceğiz. İleride 
// FOCUS_DURATION_IN_SECONDS değerini değiştirirsek (örn. 25 yerine 
// 30 dakika), ekran otomatik doğru değeri gösterecek. Aynı sebeple 
// updateProgressBar()'ı da burada bir kez çağırıyoruz; böylece bar, 
// sayfa daha ilk açıldığı anda HTML'deki statik "%100" değerine değil, 
// gerçek JS hesaplamasına göre çizilmiş oluyor.
updateDisplay();
updateProgressBar();


// =============================================================================
// 10) SES MİKSERİ MODÜLÜ
// =============================================================================

// -----------------------------------------------------------------------
// 10.1) AUDIO NESNELERİNİ OLUŞTURMA
// -----------------------------------------------------------------------
// new Audio(url): Tarayıcının yerleşik HTMLAudioElement nesnesini 
// oluşturur. Bu, sayfada görünmeyen (ekrana hiç yazdırmadığımız) ama 
// arka planda ses çalabilen "sanal" bir <audio> etiketi gibi düşünülebilir.
//
// NOT (kaynak URL'leri hakkında): Aşağıdaki URL'ler, herkese açık, 
// giriş gerektirmeyen Mixkit CDN'inin (assets.mixkit.co) genel adres 
// yapısını kullanıyor. Ancak URL içindeki sayısal ID'lerin GERÇEKTEN 
// "yağmur", "kafe" ve "şömine" seslerine karşılık geldiğini buradan 
// dinleyerek doğrulayamadım — bu yüzden bunları KESİN çalışan gerçek 
// linkler olarak değil, "TEST ETMEN GEREKEN yer tutucular" olarak kabul et.
// Doğru/gerçek linkleri almanın en güvenli yolu:
//   1) mixkit.co/free-sound-effects/rain/ (veya coffee-shop / fireplace) sayfasına git
//   2) İstediğin sesin üstünde sağ tık > "Bağlantı adresini kopyala" 
//      (ya da tarayıcı Geliştirici Araçları > Network sekmesinden 
//      ilgili .mp3 isteğinin URL'sini kopyala)
//   3) O linki aşağıdaki src değerleriyle değiştir.
// Bu şekilde çalışıp çalışmadığını kesin olarak görebilirsin.
const rainSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2515/2515-preview.mp3');
const cafeSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2529/2529-preview.mp3');
const fireplaceSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2528/2528-preview.mp3');

// loop = true: Ses dosyası sonuna geldiğinde otomatik olarak başa sarıp 
// tekrar çalmaya devam eder. Bir yağmur veya şömine sesi genelde birkaç 
// saniyelik kısa bir kayıttır; loop olmadan ses birkaç saniye sonra 
// sessizce durur ve kullanıcı "ses kesildi mi?" diye şaşırır.
rainSound.loop = true;
cafeSound.loop = true;
fireplaceSound.loop = true;

// data-sound attribute değerini ("rain", "cafe", "fireplace") ilgili 
// Audio nesnesine eşleyen bir obje (map/sözlük). Bu sayede aşağıdaki 
// forEach döngüsünde, hangi satırın hangi ses nesnesine karşılık 
// geldiğini "if rowKey === 'rain' ... else if ..." gibi uzun bir zincir 
// yazmadan, tek satırda (soundMap[soundKey]) buluyoruz.
const soundMap = {
    rain: rainSound,
    cafe: cafeSound,
    fireplace: fireplaceSound
};


// -----------------------------------------------------------------------
// 10.2) HER SES SATIRI İÇİN input LİSTENER'I KURMA
// -----------------------------------------------------------------------
// soundRows.forEach: 3 elemanlık NodeList'in HER BİRİ için, parantez 
// içindeki fonksiyonu bir kez çalıştırır. "row" parametresi, o an 
// işlenmekte olan TEK BİR .sound-row elemanını temsil eder.
soundRows.forEach((row) => {
    // row.dataset.sound: HTML'deki data-sound="rain" attribute'unun 
    // DEĞERİNİ ("rain") okur. dataset, data-* ile başlayan tüm 
    // attribute'lara JS'ten kolayca erişmemizi sağlayan özel bir arayüzdür.
    const soundKey = row.dataset.sound;

    // Her satırın İÇİNDEKİ slider'ı ve yüzde etiketini buluyoruz. 
    // document.querySelector() yerine row.querySelector() kullanmamızın 
    // sebebi: aramayı TÜM sayfada değil, SADECE bu satırın içinde yapmak. 
    // Bu hem daha performanslı hem de "yanlış satırın elemanını yakalama" 
    // riskini tamamen ortadan kaldırıyor.
    const slider = row.querySelector('.sound-slider');
    const valueLabel = row.querySelector('.sound-value');
    const audio = soundMap[soundKey];

    // 'input' olayı: Kullanıcı kaydırıcıyı SÜRÜKLEDİĞİ her an (her piksel 
    // hareketinde), fare bırakılmasını beklemeden tetiklenir. Bunu 
    // 'change' olayı yerine tercih ediyoruz çünkü 'change' sadece 
    // kullanıcı sürüklemeyi BIRAKTIĞINDA çalışır — biz ise sesin, 
    // kaydırma sırasında ANLIK olarak değişmesini istiyoruz.
    slider.addEventListener('input', () => {
        // slider.value bize her zaman bir METİN ("45" gibi) döndürür, 
        // Number() ile bunu gerçek bir sayıya çeviriyoruz ki matematik 
        // işlemi yapabilelim (aksi halde "45" + "%" gibi metin 
        // birleştirmesi yapardık, bölme/çarpma değil).
        const percentage = Number(slider.value);

        // Kullanıcıya anlık geri bildirim: "45%" gibi yüzde metnini yaz.
        valueLabel.textContent = `${percentage}%`;

        // HTMLAudioElement'in volume özelliği 0 ile 1 arasında bir 
        // ONDALIK SAYI bekler (0 = sessiz, 1 = tam ses). Kaydırıcımız 
        // ise 0-100 arası çalıştığı için, /100 ile bu aralığa çeviriyoruz.
        const volume = percentage / 100;
        audio.volume = volume;

        // audio.paused: Sesin şu an DURAKLATILMIŞ (çalmıyor) olup 
        // olmadığını söyleyen salt-okunur bir özellik.
        if (volume > 0 && audio.paused) {
            // audio.play() bir PROMISE (söz) döndürür; senkron değildir. 
            // Neden? Çünkü tarayıcı, ses dosyasını ağdan indirmesi, 
            // ses donanımına erişmesi gibi ASENKRON (zaman alabilen) 
            // işlemler yapar; bu işlemler bitene kadar play() "bekletir".
            //
            // Ayrıca modern tarayıcılar "otomatik oynatma" (autoplay) 
            // politikası uygular: kullanıcı sayfayla HİÇ etkileşime 
            // girmeden bir ses/video otomatik çalmaya kalkarsa, tarayıcı 
            // bunu genelde ENGELLER ve play() Promise'i reddeder (reject).
            // Bizim durumumuzda ses, kullanıcının kaydırıcıyı SÜRÜKLEMESİ 
            // (yani gerçek bir kullanıcı etkileşimi) sonucu başladığı 
            // için normalde bu engele takılmayız; ama dosya bulunamadı, 
            // format desteklenmiyor gibi başka sebeplerle yine de 
            // reddedilebilir. Bu yüzden play()'in olası hatasını 
            // ".catch()" ile MUTLAKA yakalamalıyız; aksi halde tarayıcı 
            // konsoluna "Uncaught (in promise)" diye çirkin, yakalanmamış 
            // bir hata düşer ve -kötü senaryoda- script'in geri kalanını 
            // etkileyebilir.
            audio.play().catch((error) => {
                console.warn(`"${soundKey}" sesi başlatılamadı:`, error);
            });
        } else if (volume === 0 && !audio.paused) {
            // Kullanıcı kaydırıcıyı tamamen sıfıra çektiyse sesi durdur. 
            // pause() burada Promise DÖNDÜRMEZ, senkron ve anlık çalışır; 
            // bu yüzden play()'in aksine catch() gerektirmez.
            audio.pause();
        }
    });
});


// -----------------------------------------------------------------------
// 10.3) TÜM SESLERİ SUSTURMA: muteAllSounds()
// -----------------------------------------------------------------------
// Bu fonksiyonu şimdilik HİÇBİR yere bağlamıyoruz (henüz bir butona 
// tıklandığında çağrılmıyor); sadece ileride "Tümünü Durdur" gibi bir 
// özellik eklediğimizde hazır kullanabileceğimiz bir araç olarak duruyor.
function muteAllSounds() {
    // Object.values(soundMap): soundMap objesinin İÇİNDEKİ DEĞERLERİ 
    // (yani 3 Audio nesnesini) bir diziye çevirir; anahtarlarla 
    // ("rain", "cafe"...) ilgilenmediğimiz için sadece values() yeterli.
    Object.values(soundMap).forEach((audio) => {
        audio.pause();
    });

    // Kaydırıcıları da görsel olarak sıfıra çekip yüzde etiketlerini 
    // güncelliyoruz; aksi halde ses durur ama slider hâlâ "70%" gösterip 
    // kullanıcıyı yanıltabilirdi.
    soundRows.forEach((row) => {
        const slider = row.querySelector('.sound-slider');
        const valueLabel = row.querySelector('.sound-value');
        slider.value = 0;
        valueLabel.textContent = '0%';
    });
}