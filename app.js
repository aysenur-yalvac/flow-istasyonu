// =============================================================================
// AKIŞ İSTASYONU — app.js
// Sayaç mantığı + Mikser modülü (Modal, Play/Pause, Akıllı Alarm dahil)
// =============================================================================

// -----------------------------------------------------------------------
// 0) DOMContentLoaded SARMALAYICISI — NEDEN HAYATİ?
// -----------------------------------------------------------------------
// 'DOMContentLoaded' olayı, tarayıcı HTML'i BAŞTAN SONA okuyup TÜM 
// elemanları DOM'a yerleştirdiğinde tetiklenir (resim/font gibi dış 
// kaynakların inmesini beklemez, sadece HTML'in kendisinin tam olarak 
// ayrıştırılmış olmasını garanti eder).
//
// Bunu neden EKLEMEK ZORUNDAYIZ, script zaten </body>'den hemen önce 
// duruyorken? Çünkü asıl risk "script NEREDE duruyor" değil, "script 
// İÇİNDEKİ TEK BİR satırın kırılması HALİNDE ne olduğu":
//
//   const startPauseBtn = document.querySelector('#btn-start-pause');
//
// Bu satır, eleman bulunamasa bile HATA FIRLATMAZ — sadece `null` 
// değerini `startPauseBtn`'e atar ve script SESSİZCE devam eder. Asıl 
// patlama birkaç satır sonra gelir:
//
//   startPauseBtn.addEventListener('click', toggleTimer);
//
// `startPauseBtn` null ise, tarayıcı "Cannot read properties of null 
// (reading 'addEventListener')" diye bir TypeError fırlatır. Ve bir 
// script dosyasında YAKALANMAMIŞ (try/catch'siz) bir hata fırlatıldığı 
// an, o script'in KALAN TÜM satırları ÇALIŞMADAN durur — konsolda 
// hata görünmese bile (devtools kapalıysa fark etmezsin), sayfadaki 
// HİÇBİR buton, HİÇBİR event listener bağlanmamış olur. Senin 
// gözlemlediğin "hiçbir şey tepki vermiyor" belirtisi tam olarak bu 
// senaryoyla uyuşuyor: TEK bir elemanın (script çalıştığı anda) DOM'da 
// bulunamaması, ONDAN SONRAKİ her şeyi (elemanın kendisiyle hiç ilgisi 
// olmayan butonlar dahil) devre dışı bırakır.
//
// 'DOMContentLoaded' bu riski TAMAMEN ortadan kaldırmaz (elemanlar 
// hâlâ yanlış ID'yle yazılmışsa yine null döner) ama şunu garanti eder: 
// script'in çalışmaya başladığı AN, HTML'in TAMAMI hazırdır — script 
// etiketinin <head>'e taşınması, "defer"/"async" eklenmesi, ya da 
// dosyanın farklı bir sayfaya farklı şekilde dahil edilmesi gibi 
// GELECEKTEKİ değişikliklere karşı bir güvenlik ağı kurar. Bu yüzden 
// tüm kodu bu olayın içine alıyoruz.
document.addEventListener('DOMContentLoaded', () => {

    // -----------------------------------------------------------------------
    // 1) DOM ELEMANLARINI SEÇME
    // -----------------------------------------------------------------------
    // Aşağıdaki HER seçici, index.html'deki karşılığıyla tek tek 
    // doğrulandı:
    //   '#timer-minutes'         -> <span id="timer-minutes">      ✓
    //   '#timer-seconds'         -> <span id="timer-seconds">      ✓
    //   '#btn-start-pause'       -> <button id="btn-start-pause">  ✓
    //   '#btn-reset'             -> <button id="btn-reset">        ✓
    //   '.progress-fill'         -> <div class="progress-fill">    ✓
    //   '.sound-row'  (x3)       -> <div class="sound-row" ...>    ✓
    //   '.mode-btn'   (x2)       -> <button class="mode-btn" ...>  ✓
    //   '#btn-settings'          -> <button id="btn-settings">     ✓
    //   '#settings-modal'        -> <div class="modal-overlay" id="settings-modal"> ✓
    //   '#modal-minutes-input'   -> <input id="modal-minutes-input"> ✓
    //   '#modal-cancel-btn'      -> <button id="modal-cancel-btn">  ✓
    //   '#modal-save-btn'        -> <button id="modal-save-btn">    ✓
    const minutesDisplay = document.querySelector('#timer-minutes');
    const secondsDisplay = document.querySelector('#timer-seconds');
    const startPauseBtn = document.querySelector('#btn-start-pause');
    const resetBtn = document.querySelector('#btn-reset');
    const progressFill = document.querySelector('.progress-fill');
    const soundRows = document.querySelectorAll('.sound-row');
    const modeButtons = document.querySelectorAll('.mode-btn');
    const settingsBtn = document.querySelector('#btn-settings');

    // Modal (Ayar Kartı) elemanları.
    // DİKKAT: index.html'de modal, HEM overlay HEM de "kapsayıcı" görevini 
    // TEK bir elemanda birleştiriyor: <div class="modal-overlay" id="settings-modal">.
    // Yani ayrı bir "#modal-overlay" elemanı YOK; #settings-modal'ın kendisi 
    // zaten o rolü üstleniyor. Bu yüzden tek bir referans yeterli.
    const settingsModal = document.querySelector('#settings-modal');
    const modalMinutesInput = document.querySelector('#modal-minutes-input');
    const modalCancelBtn = document.querySelector('#modal-cancel-btn');
    const modalSaveBtn = document.querySelector('#modal-save-btn');


    // -----------------------------------------------------------------------
    // 2) UYGULAMA DURUMU (STATE)
    // -----------------------------------------------------------------------
    let FOCUS_DURATION_IN_SECONDS = 25 * 60; // 1500 saniye
    const BREAK_DURATION_IN_SECONDS = 5 * 60; // 300 saniye

    let remainingSeconds = FOCUS_DURATION_IN_SECONDS;
    let isRunning = false;
    let intervalId = null;
    let currentMode = 'focus';


    // -----------------------------------------------------------------------
    // 3) EKRANI GÜNCELLEME: updateDisplay()
    // -----------------------------------------------------------------------
    function updateDisplay() {
        const minutes = Math.floor(remainingSeconds / 60);
        const seconds = remainingSeconds % 60;

        const formattedMinutes = String(minutes).padStart(2, '0');
        const formattedSeconds = String(seconds).padStart(2, '0');

        minutesDisplay.textContent = formattedMinutes;
        secondsDisplay.textContent = formattedSeconds;
    }


    // -----------------------------------------------------------------------
    // 3.1) İLERLEME ÇUBUĞUNU GÜNCELLEME: updateProgressBar()
    // -----------------------------------------------------------------------
    function updateProgressBar() {
        const totalSeconds = currentMode === 'focus'
            ? FOCUS_DURATION_IN_SECONDS
            : BREAK_DURATION_IN_SECONDS;

        const percentageRemaining = (remainingSeconds / totalSeconds) * 100;

        progressFill.style.width = `${percentageRemaining}%`;
    }


    // -----------------------------------------------------------------------
    // 4) HER SANİYE ÇALIŞACAK FONKSİYON: tick()
    // -----------------------------------------------------------------------
    function tick() {
        remainingSeconds--;

        updateDisplay();
        updateProgressBar();

        if (remainingSeconds <= 0) {
            stopTimer();
            remainingSeconds = 0;
            updateDisplay();

            // Süre bittiğinde önce ortam seslerini durdurup alarmı çal.
            playAlarmAndPauseAmbience();

            const nextMode = currentMode === 'focus' ? 'break' : 'focus';
            switchMode(nextMode);
        }
    }


    // -----------------------------------------------------------------------
    // 5) SAYACI BAŞLATMA: startTimer()
    // -----------------------------------------------------------------------
    function startTimer() {
        isRunning = true;
        intervalId = setInterval(tick, 1000);
        startPauseBtn.textContent = 'Duraklat';
    }


    // -----------------------------------------------------------------------
    // 6) SAYACI DURAKLATMA: stopTimer()
    // -----------------------------------------------------------------------
    function stopTimer() {
        isRunning = false;
        clearInterval(intervalId);
        startPauseBtn.textContent = 'Devam Et';
    }


    // -----------------------------------------------------------------------
    // 7) BAŞLAT/DURAKLAT BUTONU: "TOGGLE" MANTIĞI
    // -----------------------------------------------------------------------
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
        stopTimer();

        remainingSeconds = currentMode === 'focus'
            ? FOCUS_DURATION_IN_SECONDS
            : BREAK_DURATION_IN_SECONDS;
        updateDisplay();
        updateProgressBar();

        startPauseBtn.textContent = 'Başlat';
    }

    resetBtn.addEventListener('click', resetTimer);


    // -----------------------------------------------------------------------
    // 8.1) MOD DEĞİŞTİRME: switchMode()
    // -----------------------------------------------------------------------
    function switchMode(newMode) {
        currentMode = newMode;

        remainingSeconds = newMode === 'focus'
            ? FOCUS_DURATION_IN_SECONDS
            : BREAK_DURATION_IN_SECONDS;

        stopTimer();

        updateDisplay();
        updateProgressBar();

        startPauseBtn.textContent = 'Başlat';

        modeButtons.forEach((button) => {
            const isTargetButton = button.dataset.mode === newMode;
            button.classList.toggle('is-active', isTargetButton);
        });
    }

    modeButtons.forEach((button) => {
        button.addEventListener('click', () => {
            switchMode(button.dataset.mode);
        });
    });


    // -----------------------------------------------------------------------
    // 8.2) ÖZEL SÜRE AYARI — MODAL MANTIĞI
    // -----------------------------------------------------------------------
    function openSettingsModal() {
        modalMinutesInput.value = FOCUS_DURATION_IN_SECONDS / 60;
        settingsModal.classList.add('is-open');
        modalMinutesInput.focus();
    }

    function closeSettingsModal() {
        settingsModal.classList.remove('is-open');
    }

    settingsBtn.addEventListener('click', openSettingsModal);
    modalCancelBtn.addEventListener('click', closeSettingsModal);

    // Overlay'e (kartın DIŞINDAKİ karartılmış alana) tıklanınca kapatma.
    settingsModal.addEventListener('click', (event) => {
        if (event.target === settingsModal) {
            closeSettingsModal();
        }
    });

    modalSaveBtn.addEventListener('click', () => {
        const newFocusMinutes = Number(modalMinutesInput.value);

        if (Number.isNaN(newFocusMinutes) || newFocusMinutes <= 0) {
            alert('Lütfen geçerli, pozitif bir sayı girin.');
            return;
        }

        FOCUS_DURATION_IN_SECONDS = newFocusMinutes * 60;

        if (currentMode === 'focus' && !isRunning) {
            remainingSeconds = FOCUS_DURATION_IN_SECONDS;
            updateDisplay();
            updateProgressBar();
        }

        closeSettingsModal();
    });


    // -----------------------------------------------------------------------
    // 9) SAYFA İLK AÇILDIĞINDA
    // -----------------------------------------------------------------------
    updateDisplay();
    updateProgressBar();


    // =============================================================================
    // 10) SES MİKSERİ MODÜLÜ
    // =============================================================================

    // -----------------------------------------------------------------------
    // 10.1) AUDIO NESNELERİNİ OLUŞTURMA
    // -----------------------------------------------------------------------
    // NOT: Aşağıdaki Mixkit URL'leri ve alarm URL'si YER TUTUCUDUR — 
    // gerçek, doğrulanmış linklerle değiştirmen gerekiyor.
    const rainSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2515/2515-preview.mp3');
    const cafeSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2529/2529-preview.mp3');
    const fireplaceSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2528/2528-preview.mp3');

    rainSound.loop = true;
    cafeSound.loop = true;
    fireplaceSound.loop = true;

    const alarmSound = new Audio('ALARM_SESI_URL_BURAYA.mp3');
    alarmSound.loop = false;

    const soundMap = {
        rain: rainSound,
        cafe: cafeSound,
        fireplace: fireplaceSound
    };

    // -----------------------------------------------------------------------
    // 10.1.1) HER SES İÇİN TANI (DIAGNOSTIC) DİNLEYİCİSİ
    // -----------------------------------------------------------------------
    // Bir <audio> elemanı kaynağını (src) YÜKLEYEMEZSE (yanlış/bozuk URL, 
    // 404, desteklenmeyen format vb.) tarayıcı NE bir hata fırlatır NE de 
    // konsola otomatik olarak açıklayıcı bir şey yazar — sessizce başarısız 
    // olur. `.play()` çağrıldığında bunun sonucu bir Promise reddi (rejection) 
    // olarak ortaya çıkar ve biz onu zaten aşağıda `.catch()` ile yakalıyoruz. 
    // AMA o `catch` bloğu SADECE "play() başarısız oldu" der; "NEDEN?" 
    // sorusunun cevabını netleştirmek için her ses nesnesine ayrı bir 
    // 'error' dinleyicisi ekliyoruz. Bu dinleyici, kaynak YÜKLENİRKEN 
    // (kullanıcı hiç Play'e basmadan, sayfa ilk açıldığında bile) tetiklenir 
    // ve bize `audio.error.code` üzerinden TAM olarak ne olduğunu söyler:
    //   1 = MEDIA_ERR_ABORTED       (yükleme kullanıcı/script tarafından iptal edildi)
    //   2 = MEDIA_ERR_NETWORK       (ağ hatası — URL'e ulaşılamadı, 404 vb.)
    //   3 = MEDIA_ERR_DECODE        (dosya indi ama BOZUK/çözülemedi)
    //   4 = MEDIA_ERR_SRC_NOT_SUPPORTED (URL geçersiz VEYA format desteklenmiyor)
    // Bu tabloyu bilmek, "ses neden çalmıyor?" sorusunu tahmin etmekten 
    // çıkarıp konsoldan doğrudan OKUYABİLECEĞİMİZ bir bilgiye çeviriyor.
    const MEDIA_ERROR_MESSAGES = {
        1: 'yükleme iptal edildi (MEDIA_ERR_ABORTED)',
        2: 'ağ/URL hatası — dosyaya ulaşılamıyor, muhtemelen 404 (MEDIA_ERR_NETWORK)',
        3: 'dosya indi ama çözülemedi/bozuk (MEDIA_ERR_DECODE)',
        4: 'URL geçersiz ya da format desteklenmiyor (MEDIA_ERR_SRC_NOT_SUPPORTED)'
    };

    function attachAudioDiagnostics(audio, label) {
        audio.addEventListener('error', () => {
            const code = audio.error ? audio.error.code : null;
            const message = MEDIA_ERROR_MESSAGES[code] || 'bilinmeyen bir hata';
            console.error(
                `[Ses Tanı] "${label}" (${audio.src}) yüklenemedi -> ${message}. ` +
                `Bu, .catch() bloğunun yakaladığı Promise reddinin ASIL SEBEBİDİR; ` +
                `Autoplay Policy ile ilgisi yoktur — kaynağın kendisi bozuk/erişilemez.`
            );
        });
    }

    attachAudioDiagnostics(rainSound, 'rain');
    attachAudioDiagnostics(cafeSound, 'cafe');
    attachAudioDiagnostics(fireplaceSound, 'fireplace');
    attachAudioDiagnostics(alarmSound, 'alarm');


    // -----------------------------------------------------------------------
    // 10.1.2) SES KİLİDİNİ AÇMA (AUDIO UNLOCK) — Autoplay Policy için önlem
    // -----------------------------------------------------------------------
    // Ambiyans sesleri (rain/cafe/fireplace) doğrudan bir 'click'/'input' 
    // olayının İÇİNDEN çalındığı için otomatik oynatma engeline normalde 
    // takılmazlar. AMA alarmSound, setInterval'in callback'i (tick -> 
    // playAlarmAndPauseAmbience) İÇİNDEN çağrılıyor — yani play() 
    // tetiklendiği anda ortada TAZE bir kullanıcı jesti yok. Bazı 
    // tarayıcılar (özellikle Safari/iOS) bunu reddedebilir.
    //
    // Standart çözüm: sayfadaki İLK gerçek tıklamada (hangi butona 
    // olursa olsun) TÜM ses nesnelerini bir kez play() edip HEMEN 
    // ardından pause()+currentTime=0 ile durduruyoruz. Bu, kullanıcıya 
    // duyulur bir ses vermez (çok kısa bir "aç-kapa") ama tarayıcıya 
    // "bu SPESİFİK audio elemanı, bir kullanıcı jesti sırasında en az 
    // bir kez çalındı" bilgisini kaydettirir. Çoğu tarayıcı motoru, bu 
    // kaydı hatırlayıp o elemana sonradan (jestsiz) yapılan play() 
    // çağrılarına izin verir — tam da alarmın setInterval içinden 
    // çalınması gereken senaryomuz için ihtiyacımız olan şey bu.
    //
    // { once: true }: Bu dinleyicinin SADECE İLK tıklamada çalışıp 
    // kendini otomatik olarak kaldırmasını sağlar; her tıklamada 
    // gereksiz yere 4 sesi aç/kapa yapmasını istemeyiz.
    function unlockAudioPlayback() {
        [rainSound, cafeSound, fireplaceSound, alarmSound].forEach((audio) => {
            audio.play()
                .then(() => {
                    audio.pause();
                    audio.currentTime = 0;
                })
                .catch(() => {
                    // Burada sessizce geçiyoruz: bu sadece bir "ısınma" 
                    // denemesi, başarısız olursa zaten normal play() 
                    // çağrılarındaki .catch() blokları asıl hatayı 
                    // konsola detaylı şekilde yazacak.
                });
        });
    }

    document.addEventListener('click', unlockAudioPlayback, { once: true });


    // -----------------------------------------------------------------------
    // 10.2) HER SES SATIRI İÇİN KONTROLLERİ KURMA (slider + play/pause butonu)
    // -----------------------------------------------------------------------
    const soundControls = {};

    soundRows.forEach((row) => {
        const soundKey = row.dataset.sound;
        const slider = row.querySelector('.sound-slider');
        const valueLabel = row.querySelector('.sound-value');
        const toggleBtn = row.querySelector('.sound-toggle-btn');
        const audio = soundMap[soundKey];

        soundControls[soundKey] = { audio, row, slider, valueLabel, toggleBtn };

        slider.addEventListener('input', () => {
            const percentage = Number(slider.value);
            valueLabel.textContent = `${percentage}%`;
            audio.volume = percentage / 100;

            if (percentage > 0 && audio.paused) {
                startSound(soundKey);
            } else if (percentage === 0 && !audio.paused) {
                stopSound(soundKey);
            }
        });

        toggleBtn.addEventListener('click', () => {
            if (audio.paused) {
                startSound(soundKey);
            } else {
                stopSound(soundKey);
            }
        });
    });


    // -----------------------------------------------------------------------
    // 10.3) SES BAŞLATMA / DURDURMA — ORTAK FONKSİYONLAR
    // -----------------------------------------------------------------------
    function startSound(soundKey) {
        const { audio, row, slider, valueLabel, toggleBtn } = soundControls[soundKey];

        if (Number(slider.value) === 0) {
            const defaultVolume = Number(row.dataset.defaultVolume) || 30;
            slider.value = defaultVolume;
            valueLabel.textContent = `${defaultVolume}%`;
            audio.volume = defaultVolume / 100;
        }

        // audio.play(): Bu metod SENKRON değil, bir Promise döndürür — 
        // çünkü tarayıcı ses donanımına erişmek, gerekirse dosyayı 
        // tamamlamak gibi ASENKRON işler yapar. Bu Promise'i .catch() 
        // ile yakalamazsak, reddedildiğinde tarayıcı konsoluna 
        // "Uncaught (in promise)" diye çirkin bir hata düşer.
        //
        // ÖNEMLİ AYRIM — reddedilme (rejection) İKİ farklı sebepten olabilir:
        //   1) error.name === 'NotAllowedError' -> TARAYICI, kullanıcı 
        //      etkileşimi (gesture) olmadan ses çalmaya izin vermedi. 
        //      Bizim durumumuzda bu OLMAMALI, çünkü startSound() SADECE 
        //      bir 'click' ya da 'input' olayı İÇİNDEN, senkron olarak 
        //      çağrılıyor; tarayıcı bunu geçerli bir kullanıcı jesti 
        //      olarak sayar. (Otomatik oynatma engeli genelde sadece 
        //      sayfa YÜKLENİR YÜKLENMEZ, hiçbir tıklama olmadan play() 
        //      çağrıldığında devreye girer.)
        //   2) error.name === 'NotSupportedError' / 'AbortError' vb. -> 
        //      Asıl kaynak (src) YÜKLENEMEDİ (bozuk URL, 404, format 
        //      sorunu). Bizim mevcut placeholder URL'lerimizde asıl 
        //      beklenen sebep BUDUR — yukarıdaki 'error' dinleyicisi 
        //      (10.1.1) bunu zaten net bir şekilde loglayacak.
        // console.warn yerine console.error kullanıyoruz ki DevTools'ta 
        // daha göze çarpsın; error.name'i ayrıca yazdırarak hangi 
        // ihtimalle karşı karşıya olduğumuzu tek bakışta ayırt ediyoruz.
        audio.play().catch((error) => {
            console.error(
                `"${soundKey}" sesi başlatılamadı — error.name: "${error.name}". ` +
                (error.name === 'NotAllowedError'
                    ? 'Tarayıcı bunu kullanıcı etkileşimi olmadan çalınmaya çalışılan bir ses olarak algıladı.'
                    : 'Muhtemel sebep: ses dosyasının URL\'si geçersiz/erişilemez (bkz. yukarıdaki [Ses Tanı] logu).')
            );
        });

        toggleBtn.textContent = '⏸';
        row.classList.add('is-playing');
    }

    function stopSound(soundKey) {
        const { audio, row, toggleBtn } = soundControls[soundKey];
        audio.pause();
        toggleBtn.textContent = '▶';
        row.classList.remove('is-playing');
    }


    // -----------------------------------------------------------------------
    // 10.4) AKILLI ALARM VE SES SENKRONİZASYONU
    // -----------------------------------------------------------------------
    let soundsPausedByAlarm = [];

    function playAlarmAndPauseAmbience() {
        soundsPausedByAlarm = [];

        Object.keys(soundControls).forEach((soundKey) => {
            const { audio } = soundControls[soundKey];
            if (!audio.paused) {
                stopSound(soundKey);
                soundsPausedByAlarm.push(soundKey);
            }
        });

        // KRİTİK FARK — alarm sesi, ambiyans seslerinden (rain/cafe/fireplace) 
        // TEKNİK OLARAK FARKLI bir konumdan çağrılıyor:
        // startSound() bir 'click' ya da 'input' olayının İÇİNDEN, yani 
        // GERÇEK bir kullanıcı jesti (gesture) sırasında çağrılıyor — 
        // tarayıcı bunu her zaman güvenli sayar. AMA bu fonksiyon 
        // (playAlarmAndPauseAmbience), tick() üzerinden setInterval'in 
        // HER SANİYE tetiklediği bir zamanlayıcı callback'i İÇİNDEN 
        // çağrılıyor. setInterval callback'leri, kullanıcının dakikalar 
        // önce Başlat'a tıklamış olmasından TAMAMEN BAĞIMSIZ, tarayıcının 
        // kendi zamanlama motoru tarafından tetiklenir — yani play() 
        // çağrıldığı ANDA ortada "taze" bir kullanıcı jesti YOKTUR. 
        // Özellikle Safari gibi katı tarayıcılarda bu, alarmın 
        // NotAllowedError ile reddedilmesine yol açabilir.
        //
        // ÇÖZÜM: Aşağıdaki (10.1.2) "unlockAudioPlayback" fonksiyonu, 
        // sayfadaki İLK gerçek tıklamada tüm ses nesnelerini (alarm 
        // dahil) bir kere play()+pause() ile "önden ısıtıyor". Çoğu 
        // tarayıcı, bir medya elemanının GEÇMİŞTE en az bir kez gerçek 
        // jestle çalındığını hatırlar ve o SPESİFİK elemana daha sonra 
        // jestsiz play() çağrılmasına izin verir. Bu satırdaki .catch() 
        // hâlâ bir güvenlik ağı olarak duruyor, ama asıl kalıcı çözüm 
        // unlockAudioPlayback'in en baştan çalışmış olmasıdır.
        alarmSound.currentTime = 0;
        alarmSound.play().catch((error) => {
            console.error(
                `Alarm sesi çalınamadı — error.name: "${error.name}". ` +
                (error.name === 'NotAllowedError'
                    ? 'Tarayıcı, kullanıcı jesti olmadan tetiklenen bu play() çağrısını engelledi (bkz. yukarıdaki yorum).'
                    : 'Muhtemel sebep: alarm dosyasının URL\'si geçersiz/erişilemez (bkz. yukarıdaki [Ses Tanı] logu).')
            );
        });
    }

    alarmSound.addEventListener('ended', () => {
        soundsPausedByAlarm.forEach((soundKey) => {
            startSound(soundKey);
        });
        soundsPausedByAlarm = [];
    });


    // -----------------------------------------------------------------------
    // 10.5) TÜM SESLERİ SUSTURMA: muteAllSounds()
    // -----------------------------------------------------------------------
    function muteAllSounds() {
        Object.keys(soundControls).forEach((soundKey) => {
            stopSound(soundKey);
        });

        soundRows.forEach((row) => {
            const slider = row.querySelector('.sound-slider');
            const valueLabel = row.querySelector('.sound-value');
            slider.value = 0;
            valueLabel.textContent = '0%';
        });
    }

// DOMContentLoaded sarmalayıcısının kapanışı. Bu satırdan sonra artık 
// hiçbir kod çalışmıyor demek DEĞİL — tam tersine, buraya kadar olan 
// HER ŞEY, tarayıcı "DOM hazır" sinyalini verdiği AN tek seferde çalışır.
});