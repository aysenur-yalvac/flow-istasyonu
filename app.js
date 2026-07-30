// =============================================================================
// AKIŞ İSTASYONU — app.js
// Sayaç mantığı + Mikser modülü (Modal, Play/Pause, Akıllı Alarm dahil)
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

// YENİ: Modal (Ayar Kartı) elemanları.
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

    // DÜZELTME: Bu satır önceki versiyonda HER ZAMAN 
    // FOCUS_DURATION_IN_SECONDS'a bölüyordu. Bu, "Mola" modundayken 
    // (BREAK_DURATION_IN_SECONDS = 300 saniye üzerinden sayarken) 
    // yanlış bir yüzde hesaplardı — örneğin mola başında 
    // 300 / 1500 * 100 = %20 gösterip çubuğu neredeyse boş başlatırdı, 
    // oysa mola YENİ başladığı için %100 dolu görünmesi gerekiyordu. 
    // Şimdi currentMode'a bakıp DOĞRU toplam süreye bölüyoruz.
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

        // YENİ: Süre bittiğinde önce ortam seslerini durdurup alarmı çal.
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
// prompt()/alert() tabanlı eski mantığın YERİNE artık modal kartını 
// açıp kapatan, kaydetme anında değerleri okuyan bir yapı kuruyoruz.

// Modalı açan yardımcı fonksiyon. Açılırken input'a MEVCUT odaklanma 
// süresini (dakika cinsinden) önceden dolduruyoruz.
function openSettingsModal() {
    modalMinutesInput.value = FOCUS_DURATION_IN_SECONDS / 60;
    settingsModal.classList.add('is-open');

    // Kullanıcı modalı açar açmaz direkt yazmaya başlayabilsin diye 
    // input'a otomatik odaklanıyoruz (focus() metodu, tarayıcının 
    // imleci o elemana yerleştirmesini sağlar).
    modalMinutesInput.focus();
}

function closeSettingsModal() {
    settingsModal.classList.remove('is-open');
}

settingsBtn.addEventListener('click', openSettingsModal);
modalCancelBtn.addEventListener('click', closeSettingsModal);

// Overlay'e (kartın DIŞINDAKİ karartılmış alana) tıklanınca kapatma.
// #settings-modal'ın kendisi hem overlay hem de kapsayıcı olduğu için, 
// event.target'ın TAM OLARAK settingsModal'ın kendisi olup olmadığını 
// kontrol ediyoruz. Eğer kullanıcı .modal-card İÇİNDEKİ bir yere 
// (input, buton, başlık) tıklarsa, event.target o iç eleman olur ve 
// settingsModal'a EŞİT olmadığı için modal kapanmaz — sadece kartın 
// DIŞINDAKİ boşluğa tıklanınca kapanır.
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

    // Sadece "focus" modundaysak VE sayaç durmuşsa ekrana hemen yansıt.
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
// NOT: Aşağıdaki Mixkit URL'leri yer tutucudur — hangi sesin gerçekten 
// "yağmur", "kafe" ya da "şömine" olduğunu buradan doğrulayamadım. 
// mixkit.co/free-sound-effects/ üzerinden doğru linkleri alıp buradaki 
// src değerleriyle değiştirmen gerekiyor.
// Doğrudan test edip kullanabileceğin ASMR ve yumuşak ses linkleri:

const rainSound = new Audio('https://cdn.pixabay.com/download/audio/2021/09/06/audio_75c32512a2.mp3?filename=light-rain-loop-2-87532.mp3'); 
// Yağmur: Yumuşak, kesintisiz ve huzurlu bir arka plan yağmur sesi.

const cafeSound = new Audio('https://cdn.pixabay.com/download/audio/2022/05/16/audio_db32c8c4a1.mp3?filename=coffeeshop-ambience-110034.mp3'); 
// Kafe: Arkada boğuk, dikkat dağıtmayan sakin bir kahve dükkanı mırıltısı.

const fireplaceSound = new Audio('https://cdn.pixabay.com/download/audio/2022/03/24/audio_c37d579ef6.mp3?filename=fireplace-106518.mp3'); 
// Şömine: Çıtırdayan, kulak yormayan sıcak odun sesleri.

rainSound.loop = true;
cafeSound.loop = true;
fireplaceSound.loop = true;


// YENİ: Alarm sesi — kısa, tek seferlik bir bildirim sesi. Bu da bir 
// YER TUTUCUDUR, gerçek bir alarm/zil sesi URL'siyle değiştirmen gerekir.
const alarmSound = new Audio('https://cdn.pixabay.com/download/audio/2021/08/09/audio_02379e56e4.mp3?filename=soft-bell-notification-1497.mp3');
alarmSound.loop = false;

const soundMap = {
    rain: rainSound,
    cafe: cafeSound,
    fireplace: fireplaceSound
};


// -----------------------------------------------------------------------
// 10.2) HER SES SATIRI İÇİN KONTROLLERİ KURMA (slider + play/pause butonu)
// -----------------------------------------------------------------------
// DEĞİŞTİ: Artık her satırın TÜM ilgili elemanlarını (audio, row, 
// slider, valueLabel, toggleBtn) soundControls objesinde saklıyoruz. 
// Bunun sebebi iki tane: 
// 1) startSound/stopSound fonksiyonlarının, hem slider hem buton 
//    tarafından ORTAK kullanılabilmesi (tekrar kod yazmamak için).
// 2) Alarm bittiğinde "hangi sesler çalıyordu?" diye tekrar bu 
//    elemanlara (özellikle toggleBtn ve row) erişebilmemiz gerekiyor.
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

    // YENİ: Play/Pause butonu. audio.paused durumuna göre TOGGLE yapıyor.
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
// startSound: Bir sesi başlatan, ikonu ve .is-playing class'ını 
// güncelleyen ORTAK fonksiyon. Hem slider'dan hem play/pause 
// butonundan hem de alarm-sonrası senkronizasyondan çağrılıyor.
function startSound(soundKey) {
    const { audio, row, slider, valueLabel, toggleBtn } = soundControls[soundKey];

    // GÜVENLİ VARSAYILAN SES: Kullanıcı slider'a hiç dokunmadan 
    // doğrudan Play'e bastıysa, slider hâlâ 0'dadır. Sesi %0 sesle 
    // başlatmanın anlamı yok, bu yüzden data-default-volume'daki 
    // (%30) değeri kullanıyoruz. "|| 30" fallback'i, attribute hiç 
    // yoksa (Number(undefined) -> NaN, "falsy") devreye giriyor.
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

// stopSound: Bir sesi durduran, ikonu ve class'ı geri alan ORTAK fonksiyon.
function stopSound(soundKey) {
    const { audio, row, toggleBtn } = soundControls[soundKey];
    audio.pause();
    toggleBtn.textContent = '▶';
    row.classList.remove('is-playing');
}


// -----------------------------------------------------------------------
// 10.4) AKILLI ALARM VE SES SENKRONİZASYONU
// -----------------------------------------------------------------------
// soundsPausedByAlarm: Alarm çalarken PAUSE ettiğimiz seslerin listesi. 
// Dizi kullanmamızın sebebi: aynı anda birden fazla ortam sesi (örn. 
// hem yağmur hem kafe) çalıyor olabilir; alarm bitince SADECE bunları 
// geri açmalıyız — kullanıcının hiç açmadığı bir sesi yanlışlıkla 
// başlatmamalıyız.
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

// 'ended' olayı: Ses dosyası SONUNA kadar çalıp doğal olarak bittiğinde 
// tetiklenir (pause() ile durdurulduğunda DEĞİL). Bu yüzden "alarm 
// bitti, ortam seslerine dönebiliriz" bilgisini almak için doğru 
// olay budur.
alarmSound.addEventListener('ended', () => {
    soundsPausedByAlarm.forEach((soundKey) => {
        startSound(soundKey);
    });
    soundsPausedByAlarm = [];
});


// -----------------------------------------------------------------------
// 10.5) TÜM SESLERİ SUSTURMA: muteAllSounds()
// -----------------------------------------------------------------------
// DEĞİŞTİ: Artık stopSound()'u çağırıyor ki play/pause butonlarının 
// ikonu ve .is-playing class'ı da tutarlı kalsın (eskiden sadece 
// audio.pause() çağrılıyordu, buton görsel olarak "çalıyor" kalmaya 
// devam ederdi).
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