const sporePathInput = document.getElementById('spore-path');
const gaPathInput = document.getElementById('ga-path');
const sporeErrorMsg = Object.assign(document.createElement('div'), { style: 'color:red;font-size:0.95em;margin-top:4px;display:none' });
sporePathInput.parentElement.appendChild(sporeErrorMsg);
const gaErrorMsg = Object.assign(document.createElement('div'), { style: 'color:red;font-size:0.95em;margin-top:4px;display:none' });
gaPathInput.parentElement.appendChild(gaErrorMsg);

let currentTranslations = {}, currentLang = 'en', newVersionAvailable = null;

window.addEventListener('DOMContentLoaded', async () => {
    document.querySelector('.window-close')?.addEventListener('click', () => window.electronAPI.closeWindow());
    document.querySelector('.window-minimize')?.addEventListener('click', () => window.electronAPI.minimizeWindow());
    document.getElementById('discord-btn')?.addEventListener('click', () => window.electronAPI.openDiscord());
    document.getElementById('update-launcher-btn')?.addEventListener('click', function () {
        if (confirm(currentTranslations.updateConfirm)) {
            this.disabled = true;
            this.textContent = currentTranslations.updatingNow;
            window.electronAPI.updateLauncher();
        }
    });

    const modsModal = document.getElementById('mods-modal');
    const modsModalContent = modsModal.querySelector('.mods-modal-content');
    document.querySelector('.footer-item img[alt="Install Mods"]')?.parentElement.addEventListener('click', () => {
        modsModal.classList.remove('hidden', 'animating-out');
        modsModal.classList.add('animating-in');
        modsModalContent.classList.remove('animating-out');
        modsModalContent.classList.add('animating-in');
        setTimeout(() => {
            modsModal.classList.remove('animating-in');
            modsModalContent.classList.remove('animating-in');
        }, 350);
    });

    document.getElementById('close-mods-modal')?.addEventListener('click', e => {
        e.preventDefault();
        modsModal.classList.add('animating-out');
        modsModalContent.classList.add('animating-out');
        setTimeout(() => {
            modsModal.classList.add('hidden');
            modsModal.classList.remove('animating-out');
            modsModalContent.classList.remove('animating-out');
        }, 250);
    });

    const settingsModal = document.getElementById('settings-modal');
    const settingsModalContent = settingsModal.querySelector('.mods-modal-content');
    document.querySelector('.footer-item img[alt="Settings"]')?.parentElement.addEventListener('click', async () => {
        settingsModal.classList.remove('hidden', 'animating-out');
        settingsModal.classList.add('animating-in');
        settingsModalContent.classList.remove('animating-out');
        settingsModalContent.classList.add('animating-in');
        setTimeout(() => {
            settingsModal.classList.remove('animating-in');
            settingsModalContent.classList.remove('animating-in');
        }, 350);
        await loadLocale(localStorage.getItem('sporeLang') || langSelect.value);
        await validateSporePath();
        await validateGAPath();
    });
    document.getElementById('close-settings-modal')?.addEventListener('click', e => {
        e.preventDefault();
        settingsModal.classList.add('animating-out');
        settingsModalContent.classList.add('animating-out');
        setTimeout(() => {
            settingsModal.classList.add('hidden');
            settingsModal.classList.remove('animating-out');
            settingsModalContent.classList.remove('animating-out');
        }, 250);
    });

    document.getElementById('uninstall-mods-btn')?.addEventListener('click', async () => {
        if (!confirm(currentTranslations.uninstallAllConfirm)) return;
        alert((await window.electronAPI.uninstallAllMods()) ? currentTranslations.uninstallAllSuccess : currentTranslations.uninstallAllError);
    });

    if (sporePathInput && window.electronAPI.detectSporePath) {
        const detectedPath = await window.electronAPI.detectSporePath();
        if (detectedPath) { sporePathInput.value = detectedPath; await validateSporePath(); }
    }
    if (gaPathInput && window.electronAPI.detectGAPPath) {
        const detectedGAPath = await window.electronAPI.detectGAPPath();
        if (detectedGAPath) { gaPathInput.value = detectedGAPath; await validateGAPath(); }
    }
    document.getElementById('browse-spore-path')?.addEventListener('click', async () => {
        const folder = await window.electronAPI.browseFolder();
        if (folder) { sporePathInput.value = folder; await validateSporePath(); }
    });
    document.getElementById('browse-ga-path')?.addEventListener('click', async () => {
        const folder = await window.electronAPI.browseFolder();
        if (folder) { gaPathInput.value = folder; await validateGAPath(); }
    });

    document.querySelector('.play-btn-spore').addEventListener('click', async () => {
        if (!await window.electronAPI.launchSpore()) alert(currentTranslations.sporeLaunchError);
    });
    document.querySelector('.play-btn-ga').addEventListener('click', async () => {
        if (!await window.electronAPI.launchGA()) alert(currentTranslations.gaLaunchError);
    });

    document.querySelectorAll('.install-mod-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            await window.electronAPI.setSporePath(sporePathInput.value.trim());
            await window.electronAPI.setGAPath(gaPathInput.value.trim());
            const target = btn.getAttribute('data-target');

            const alreadyInstalled = await window.electronAPI.isModInstalled(target);
            if (alreadyInstalled) {
                const confirmMsg = currentTranslations.modAlreadyInstalledConfirm;
                const confirmed = await window.electronAPI.showConfirm({
                    title: currentTranslations.launcherTitle,
                    message: confirmMsg,
                    okText: currentTranslations.reinstall,
                    cancelText: currentTranslations.cancel
                });
                if (!confirmed) return;
            }

            await window.electronAPI.setInstalling(true);

            const progress = btn.parentElement.querySelector('#install-progress');
            const progressBarFill = progress.querySelector('.progress-bar-fill');
            const progressText = progress.querySelector('.progress-text');
            progress.classList.remove('hidden');
            document.querySelectorAll('.install-mod-btn').forEach(b => b.disabled = true);
            progressBarFill.classList.remove('progress-bar-fill-spore', 'progress-bar-fill-sporega');
            progressBarFill.classList.add(target === 'spore' ? 'progress-bar-fill-spore' : 'progress-bar-fill-sporega');
            progressText.textContent = currentTranslations.installingLong;
            progressBarFill.style.width = '0%';
            window.electronAPI.removeModInstallProgressListeners();
            window.electronAPI.onModInstallProgress(percent => {
                progressBarFill.style.width = percent + '%';
                progressText.textContent = percent < 50 ? currentTranslations.downloadingLong : currentTranslations.installingLong;
            });
            const result = await window.electronAPI.installMod('mod.zip', target);
            progressBarFill.style.width = '100%';
            progressText.textContent = result ? currentTranslations.installComplete : currentTranslations.installError;
            setTimeout(async () => {
                progress.classList.add('hidden');
                document.querySelectorAll('.install-mod-btn').forEach(b => b.disabled = false);
                progressBarFill.style.width = '0%';
                progressText.textContent = currentTranslations.installingLong;
                await window.electronAPI.setInstalling(false);
            }, 1200);
        });
    });

    window.electronAPI.onUpdateAvailable((_, version) => {
        newVersionAvailable = version;
        const updatedTextEl = document.querySelector('[data-i18n="updatedText"]');
        if (updatedTextEl) {
            updatedTextEl.innerHTML = `${currentTranslations.updateAvailableText} <br><span style="color:#aaa;">${currentTranslations.newVersionLabel || 'New version:'} v${version}</span>`;
        }
        const updateBtn = document.getElementById('update-launcher-btn');
        if (updateBtn) updateBtn.style.display = 'block';
    });

    window.electronAPI.onUpdateDownloaded(() => {
        const updateBtn = document.getElementById('update-launcher-btn');
        if (updateBtn) updateBtn.style.display = 'block';
        const updatedTextEl = document.querySelector('[data-i18n="updatedText"]');
        if (updatedTextEl) {
            let versionInfo = newVersionAvailable ? `<br><span style="color:#aaa;">${currentTranslations.newVersionLabel || 'New version:'} v${newVersionAvailable}</span>` : '';
            updatedTextEl.innerHTML = currentTranslations.updateAvailableText + versionInfo;
        }
    });
});

async function loadLocale(lang) {
    const localePath = lang === 'es' ? 'locales/es.json' : 'locales/en.json';
    const response = await fetch(localePath);
    if (!response.ok) return;
    const translations = await response.json();
    currentTranslations = translations;
    currentLang = lang;
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[key]) {
            if (['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName)) el.placeholder = translations[key];
            else el.innerHTML = translations[key];
        }
    });
    document.title = translations['title'] || document.title;

    const launcherTitleEl = document.querySelector('.launcher-title');
    if (launcherTitleEl && window.electronAPI.getAppVersion) {
        const version = await window.electronAPI.getAppVersion();
        launcherTitleEl.innerHTML += ` <span style="color:#aaa;font-size:0.85em;">v${version}</span>`;
    }

    const updatedTextEl = document.querySelector('[data-i18n="updatedText"]');
    if (updatedTextEl && newVersionAvailable) {
        updatedTextEl.innerHTML = `${currentTranslations.updateAvailableText} <br><span style="color:#aaa;">${currentTranslations.newVersionLabel || 'Nueva versión:'} v${newVersionAvailable}</span>`;
    }
}

const langSelect = document.getElementById('lang-select');
if (langSelect) {
    langSelect.addEventListener('change', async () => {
        const lang = langSelect.value;
        localStorage.setItem('sporeLang', lang);
        await window.electronAPI.setLanguage(lang);
        await loadLocale(lang);
        await validateSporePath();
        await validateGAPath();
    });
    langSelect.value = localStorage.getItem('sporeLang') || 'en';
    loadLocale(langSelect.value);
} else {
    loadLocale('en');
}

async function validateSporePath() {
    const isValid = await window.electronAPI.checkSporePath(sporePathInput.value, 'spore');
    sporeErrorMsg.textContent = currentTranslations.sporePathError;
    sporeErrorMsg.style.display = isValid ? 'none' : 'block';
}
async function validateGAPath() {
    const isValid = await window.electronAPI.checkSporePath(gaPathInput.value, 'ga');
    gaErrorMsg.textContent = currentTranslations.gaPathError;
    gaErrorMsg.style.display = isValid ? 'none' : 'block';
}

sporePathInput.addEventListener('change', async () => { await window.electronAPI.setSporePath(sporePathInput.value); validateSporePath(); });
sporePathInput.addEventListener('input', async () => { await window.electronAPI.setSporePath(sporePathInput.value.trim()); validateSporePath(); });
gaPathInput.addEventListener('change', async () => { await window.electronAPI.setGAPath(gaPathInput.value); validateGAPath(); });
gaPathInput.addEventListener('input', async () => { await window.electronAPI.setGAPath(gaPathInput.value.trim()); validateGAPath(); });