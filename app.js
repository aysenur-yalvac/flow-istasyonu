// =============================================================================
// AKIŞ İSTASYONU — app.js (GÜNCEL VE TAM SÜRÜM)
// =============================================================================


// -----------------------------------------------------------------------
// 1) DOM ELEMANLARINI SEÇME
// -----------------------------------------------------------------------
const minutesDisplay = document.querySelector('#timer-minutes');
const secondsDisplay = document.querySelector('#timer-seconds');
const startPauseBtn = document.querySelector('#btn-start-pause');
const resetBtn = document.querySelector('#btn-reset');
const progressFill = document.querySelector('.progress-fill');
const soundRows = document.querySelectorAll('.sound-row');
const modeButtons = document.querySelectorAll('.mode-btn');
const settingsBtn = document.querySelector('#btn-settings');

// ÖNEMLİ DÜZELTME: index.html'e baktığımda, ".modal-overlay" ve 
// "#settings-modal" AYRI İKİ ELEMAN DEĞİL — aynı <div>'in hem class'ı 
// hem id'si. Yani "settingsModal" değişkenimiz zaten overlay'in 
// kendisi; ayrıca bir "modalOverlay" değişkenine gerek yok. Bunu 
// bilerek tek değişkende topluyoruz.
const settingsModal = document.querySelector('#settings-modal');
const modalCard = document.querySelector('.modal-card');
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

    // NOT: Eskiden burada hep FOCUS_DURATION_IN_SECONDS'a bölüyorduk. 
    // Ama artık "Mola" modunda da bir ilerleme çubuğu göstermek istersek, 
    // paydanın da MEVCUT moda göre değişmesi gerekiyor; aksi halde mola 
    // modundayken çubuk %20 gibi anlamsız, hep-dolu-görünmeyen bir 
    // değerde takılı kalırdı (300/1500 = %20). currentMode'a göre doğru 
    // paydayı (totalSeconds) seçerek bu hatayı baştan önlüyoruz.
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

        // YENİ: Moda geçmeden ÖNCE alarmı çalıp ortam seslerini durduruyoruz.
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
// 7) BAŞLAT/DURAKLAT BUTONU
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
// 8.2) ÖZEL SÜRE AYARI: MODAL MANTIĞI
// -----------------------------------------------------------------------
// Modalı açan fonksiyon: input'u MEVCUT odaklanma süresiyle (dakika 
// cinsinden) dolduruyoruz ki kullanıcı "şu an ne ayarlı" bilgisini görsün.
function openSettingsModal() {
    modalMinutesInput.value = FOCUS_DURATION_IN_SECONDS / 60;
    settingsModal.classList.add('is-open');

    // Modal açılır açılmaz input'a odaklanmak (focus), kullanıcının 
    // hemen yazmaya başlayabilmesini sağlar — fare ile ayrıca tıklamasına 
    // gerek kalmaz. Küçük ama kullanışlı bir UX detayı.
    modalMinutesInput.focus();
}

function closeSettingsModal() {
    settingsModal.classList.remove('is-open');
}

settingsBtn.addEventListener('click', openSettingsModal);
modalCancelBtn.addEventListener('click', closeSettingsModal);

// ARKAPLANA (OVERLAY) TIKLAYINCA KAPATMA:
// settingsModal ZATEN overlay'in kendisi olduğu için, .modal-card İÇİNE 
// tıklandığında da olay (event) yukarı "kabarır" (bubbling) ve bu 
// listener'ı tetikler. Bunu istemiyoruz — kullanıcı kart içindeki 
// input'a veya butonlara tıkladığında modal KAPANMAMALI, sadece 
// GERÇEKTEN karartılmış arkaplana (karta değil) tıklandığında kapanmalı.
// Bu yüzden event.target'ın TAM OLARAK settingsModal'ın kendisi olup 
// olmadığını kontrol ediyoruz; eğer tıklanan yer modal-card'ın içindeki 
// bir eleman ise event.target o iç eleman olur, settingsModal DEĞİL.
settingsModal.addEventListener('click', (event) => {
    if (event.target === settingsModal) {
        closeSettingsModal();
    }
});

modalSaveBtn.addEventListener('click', () => {
    const newFocusMinutes = Number(modalMinutesInput.value);

    if (Number.isNaN(newFocusMinutes) || newFocusMinutes <= 0) {
        alert('Lütfen geçerli, pozitif bir sayı girin.');
        return; // Modalı kapatmıyoruz ki kullanıcı hemen düzeltebilsin.
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
// NOT (kaynak URL'leri hakkında): Aşağıdaki linkler yer tutucudur — 
// hangi ID'nin gerçekten "yağmur/kafe/şömine/alarm" sesine karşılık 
// geldiğini buradan dinleyerek doğrulayamadım. mixkit.co üzerinden 
// kendi seçtiğin sesin gerçek linkini alıp buraya yapıştırman gerekiyor.
const rainSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2515/2515-preview.mp3');
const cafeSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2529/2529-preview.mp3');
const fireplaceSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2528/2528-preview.mp3');

// YENİ: Alarm sesi. loop=false OLMALI (varsayılanı zaten false, ama 
// niyeti netleştirmek için açıkça yazıyoruz) — alarm sonsuza kadar 
// çalmamalı, bir kere çalıp bitmeli ki "ended" olayını yakalayabilelim.
const alarmSound = new Audio('ALARM_SESI_URL_BURAYA.mp3');
alarmSound.loop = false;

rainSound.loop = true;
cafeSound.loop = true;
fireplaceSound.loop = true;

const soundMap = {
    rain: rainSound,
    cafe: cafeSound,
    fireplace: fireplaceSound
};

// YENİ: soundKey -> o satırın TÜM ilgili elemanlarını tutan obje. Play/
// Pause butonu ve alarm senkronizasyonu, bu elemanlara tek bir yerden 
// (soundControls[key]) erişebilmek için buna ihtiyaç duyuyor.
const soundControls = {};


// -----------------------------------------------------------------------
// 10.2) HER SES SATIRI İÇİN LİSTENER'LARI KURMA (slider + play/pause butonu)
// -----------------------------------------------------------------------
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

    // YENİ: Play/Pause butonu. Slider'ın SEVİYESİNİ bozmadan, sadece 
    // çalma/durma durumunu değiştiriyor — bu yüzden startSound/stopSound 
    // içinde slider.value'ya SADECE %0 iken (güvenli varsayılan için) 
    // dokunuyoruz, aksi halde hep olduğu gibi bırakıyoruz.
    toggleBtn.addEventListener('click', () => {
        if (audio.paused) {
            startSound(soundKey);
        } else {
            stopSound(soundKey);
        }
    });
});

// YENİ: Bir sesi başlatan, gerektiğinde güvenli varsayılan sesi (%30) 
// uygulayan ve ikon/class durumunu güncelleyen ORTAK fonksiyon. Hem 
// slider'dan hem play/pause butonundan çağrılıyor.
function startSound(soundKey) {
    const { audio, row, slider, valueLabel, toggleBtn } = soundControls[soundKey];

    // GÜVENLİ VARSAYILAN SES: Kullanıcı slider'a hiç dokunmadan doğrudan 
    // Play'e bastıysa slider hâlâ 0'dadır; sesi %0 sesle başlatmanın 
    // anlamı yok. row üzerindeki data-default-volume="30" attribute'unu 
    // okuyup slider'ı ve ekrandaki yüzdeyi buna göre güncelliyoruz.
    if (Number(slider.value) === 0) {
        const defaultVolume = Number(row.dataset.defaultVolume) || 30;
        slider.value = defaultVolume;
        valueLabel.textContent = `${defaultVolume}%`;
        audio.volume = defaultVolume / 100;
    }

    audio.play().catch((error) => {
        console.warn(`"${soundKey}" sesi başlatılamadı:`, error);
    });

    toggleBtn.textContent = '⏸';
    row.classList.add('is-playing');
}

// YENİ: Bir sesi durduran, ikon/class durumunu geri alan ORTAK fonksiyon.
function stopSound(soundKey) {
    const { audio, row, toggleBtn } = soundControls[soundKey];
    audio.pause();
    toggleBtn.textContent = '▶';
    row.classList.remove('is-playing');
}


// -----------------------------------------------------------------------
// 10.3) TÜM SESLERİ SUSTURMA: muteAllSounds()
// -----------------------------------------------------------------------
function muteAllSounds() {
    Object.keys(soundControls).forEach((soundKey) => {
        stopSound(soundKey);
        const { slider, valueLabel } = soundControls[soundKey];
        slider.value = 0;
        valueLabel.textContent = '0%';
    });
}


// -----------------------------------------------------------------------
// 10.4) YENİ: AKILLI ALARM VE SES SENKRONİZASYONU
// -----------------------------------------------------------------------
// Alarm çalarken PAUSE ettiğimiz seslerin listesi. Dizi (array) olmasının 
// sebebi: aynı anda birden fazla ortam sesi (örn. hem yağmur hem kafe) 
// çalıyor olabilir; hangilerini durdurduğumuzu hatırlamamız gerekiyor ki 
// alarm bitince SADECE onları geri açalım — kullanıcının hiç açmadığı 
// bir sesi yanlışlıkla başlatmayalım.
let soundsPausedByAlarm = [];

function playAlarmAndPauseAmbience() {
    soundsPausedByAlarm = []; // Her çalışta listeyi sıfırdan kuruyoruz.

    Object.keys(soundControls).forEach((soundKey) => {
        const { audio } = soundControls[soundKey];
        if (!audio.paused) {
            stopSound(soundKey); // ikonu/class'ı da doğru şekilde günceller
            soundsPausedByAlarm.push(soundKey);
        }
    });

    alarmSound.currentTime = 0; // Baştan başlasın diye (üst üste tetiklenirse).
    alarmSound.play().catch((error) => {
        console.warn('Alarm sesi çalınamadı:', error);
    });
}

// 'ended' olayı: Ses dosyası SONUNA kadar çalıp DOĞAL olarak bittiğinde 
// tetiklenir (pause() ile durdurulduğunda DEĞİL). Bu yüzden "alarm bitti, 
// ortam seslerine dönebiliriz" bilgisini almak için doğru olay budur.
alarmSound.addEventListener('ended', () => {
    soundsPausedByAlarm.forEach((soundKey) => {
        startSound(soundKey);
    });
    soundsPausedByAlarm = [];
});