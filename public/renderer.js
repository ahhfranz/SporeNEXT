let currentTranslations = {}, newVersionAvailable = null;

function cleanupListeners(btns) {
    btns.forEach(b => {
        if (b.downloadListener) {
            window.electronAPI.removeModDownloadProgress(b.downloadListener);
            b.downloadListener = null;
        }
        if (b.installListener) {
            window.electronAPI.removeModInstallProgress(b.installListener);
            b.installListener = null;
        }
        if (b.unzipListener) {
            window.electronAPI.removeModUnzipProgress(b.unzipListener);
            b.unzipListener = null;
        }
        b.currentInstallId = null;
    });
}

document.addEventListener('DOMContentLoaded', function () {
    const filterButtons = document.querySelectorAll('.filter-btn');
    const modRows = document.querySelectorAll('.mods-table tbody tr');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', function () {
            filterButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            let filter = this.id.replace('filter-', '');
            modRows.forEach(row => {
                if (filter === 'all') {
                    row.style.display = '';
                } else {
                    row.style.display = row.getAttribute('data-category') === filter ? '' : 'none';
                }
            });
        });
    });

    document.getElementById('filter-all')?.classList.add('active');
});


document.body.addEventListener('click', function (e) {
    const target = e.target.closest('a');
    if (target && target.closest('.disclaimer-text')) {
        e.preventDefault();
        window.electronAPI.openExternal(target.href);
    }
});

function setupModButton(modId, options) {
    const btns = document.querySelectorAll(
        `.download-mod-spore-btn[data-mod-id="${modId}"], .download-mod-sporega-btn[data-mod-id="${modId}"]`
    );
    btns.forEach(btn => {
        const gameType = btn.getAttribute('data-game-type');
        const btnGroup = btn.closest('.mod-action-btn-group');
        const progressBar = btnGroup.querySelector('.mod-progress-bar');
        let progressFill = btn.classList.contains('download-mod-sporega-btn')
            ? progressBar.querySelector('.progress-bar-fill-ga')
            : progressBar.querySelector('.progress-bar-fill');
        let uninstallFill = progressBar.querySelector('.progress-bar-fill-uninstall');
        let progressText = btnGroup.querySelector('.progress-bar-text');

        async function updateState() {
            const isInstalled = await options.isInstalled(gameType);
            const span = btn.querySelector('span[data-i18n]');
            const icon = btn.querySelector('img');
            if (isInstalled) {
                btn.classList.add('uninstall-mod-spore-btn');
                if (span) {
                    span.setAttribute('data-i18n', 'uninstall');
                    span.textContent = currentTranslations.uninstall || 'Uninstall';
                }
                if (icon) {
                    icon.src = btn.classList.contains('download-mod-sporega-btn')
                        ? 'assets/sporega-uninstall.png'
                        : 'assets/spore-uninstall.png';
                }
                progressText.textContent = '';
                progressBar.style.display = 'none';
            } else {
                btn.classList.remove('uninstall-mod-spore-btn');
                if (span) {
                    span.setAttribute('data-i18n', 'download');
                    span.textContent = currentTranslations.download || 'Download';
                }
                if (icon) {
                    icon.src = btn.classList.contains('download-mod-sporega-btn')
                        ? 'assets/sporega.png'
                        : 'assets/spore.png';
                }
            }
        }

        btn.downloadListener = null;
        btn.installListener = null;
        btn.unzipListener = null;
        btn.currentInstallId = null;

        btn.onclick = async (e) => {
            cleanupListeners(btns);
            document.querySelectorAll('.download-mod-spore-btn, .download-mod-sporega-btn').forEach(b => {
                b.disabled = true;
                b.classList.add('mod-download-disabled');
            });

            e.stopPropagation();
            await updateState();
            const span = btn.querySelector('span[data-i18n]');
            if (span && span.getAttribute('data-i18n') === 'uninstall') {
                if (progressFill) {
                    progressFill.style.display = 'none';
                    progressFill.style.width = '0%';
                }
                if (!uninstallFill) {
                    uninstallFill = document.createElement('div');
                    uninstallFill.className = 'progress-bar-fill-uninstall';
                    uninstallFill.style.width = '0%';
                    uninstallFill.style.height = '100%';
                    uninstallFill.style.background = '#ff4d4f';
                    uninstallFill.style.borderRadius = '6px';
                    uninstallFill.style.transition = 'width 5s';
                    progressBar.appendChild(uninstallFill);
                }
                uninstallFill.style.width = '0%';
                uninstallFill.style.display = 'block';
                btn.style.display = 'none';
                progressBar.style.display = 'block';
                progressText.textContent = currentTranslations.uninstalling || 'Desinstalando...';
                setTimeout(() => uninstallFill.style.width = '100%', 100);
                setTimeout(async () => {
                    await options.uninstall(gameType);
                    progressBar.style.display = 'none';
                    uninstallFill.style.width = '0%';
                    uninstallFill.style.display = 'none';
                    if (progressFill) progressFill.style.display = 'block';
                    btn.style.display = '';
                    progressText.textContent = '';
                    await updateState();
                    cleanupListeners(btns);
                    document.querySelectorAll('.download-mod-spore-btn, .download-mod-sporega-btn').forEach(b => {
                        b.disabled = false;
                        b.classList.remove('mod-download-disabled');
                    });
                }, 5100);
            } else {
                const modUrl = btn.getAttribute('data-mod-url');
                if (!modUrl) {
                    document.querySelectorAll('.download-mod-spore-btn, .download-mod-sporega-btn').forEach(b => {
                        b.disabled = false;
                        b.classList.remove('mod-download-disabled');
                    });
                    return;
                }
                if (progressFill) {
                    progressFill.style.display = 'block';
                    progressFill.style.width = '0%';
                    progressFill.style.transition = 'width 0.2s';
                }
                progressText.textContent = '';
                if (uninstallFill) {
                    uninstallFill.style.display = 'none';
                    uninstallFill.style.width = '0%';
                }
                btn.style.display = 'none';
                progressBar.style.display = 'block';

                btn.currentInstallId = Math.random().toString(36).slice(2);

                if (btn.downloadListener) window.electronAPI.removeModDownloadProgress(btn.downloadListener);
                btn.downloadListener = (progress) => {
                    if (progress.modId !== modId) return;
                    if (progress.gameType !== gameType) return;
                    if (progress.installId && progress.installId !== btn.currentInstallId) return;
                    if (btn.style.display === 'none') {
                        if (progressFill) progressFill.style.width = `${progress.percent}%`;
                        if (progressText) progressText.textContent = `${currentTranslations.downloadingLong || 'Descargando...'} ${progress.percent}%`;
                    }
                };
                window.electronAPI.onModDownloadProgress(btn.downloadListener);

                let zipPath, extractedPath;
                try {
                    zipPath = await options.download(modUrl, gameType, btn.currentInstallId);

                    if (btn.installListener) window.electronAPI.removeModInstallProgress(btn.installListener);
                    btn.installListener = (progress) => {
                        if (progress.modId !== modId) return;
                        if (progress.gameType !== gameType) return;
                        if (progress.installId && progress.installId !== btn.currentInstallId) return;
                        if (btn.style.display === 'none') {
                            if (progressFill) progressFill.style.width = `${progress.percent}%`;
                            if (progressText) progressText.textContent = `${currentTranslations.installingLong || 'Instalando...'} ${progress.percent}%`;
                        }
                    };
                    window.electronAPI.onModInstallProgress(btn.installListener);

                    if (btn.unzipListener) window.electronAPI.removeModUnzipProgress(btn.unzipListener);
                    btn.unzipListener = (progress) => {
                        if (!zipPath || progress.zipPath !== zipPath) return;
                        if (btn.style.display === 'none') {
                            if (progressFill) progressFill.style.width = `${progress.percent}%`;
                            if (progressText) progressText.textContent = `${currentTranslations.installingLong || 'Extrayendo...'} ${progress.percent}%`;
                        }
                    };
                    window.electronAPI.onModUnzipProgress(btn.unzipListener);

                    const extractDir = zipPath.replace(/\.zip$/i, `-${gameType}-${Date.now()}`);
                    extractedPath = await window.electronAPI.unzipModTo(zipPath, extractDir);
                    try {
                        await options.install(extractedPath, zipPath, gameType, btn.currentInstallId);
                    } catch (err) {
                        if (err && err.message && err.message.includes('instalación de mod en curso')) {
                            alert('Ya hay una instalación de mod en curso. Espera a que termine antes de instalar otro.');
                        } else {
                            alert('Error al instalar el mod:\n' + (err.message || err));
                        }
                        if (progressFill) progressFill.style.width = '0%';
                        progressText.textContent = '';
                        btn.style.display = '';
                        cleanupListeners(btns);
                        setTimeout(() => {
                            progressBar.style.display = 'none';
                            progressText.textContent = '';
                        }, 2000);
                        document.querySelectorAll('.download-mod-spore-btn, .download-mod-sporega-btn').forEach(b => {
                            b.disabled = false;
                            b.classList.remove('mod-download-disabled');
                        });
                        return;
                    }
                } catch (e) {
                    if (progressFill) progressFill.style.width = '0%';
                    progressText.textContent = '';
                    btn.style.display = '';
                    cleanupListeners(btns);
                    setTimeout(() => {
                        progressBar.style.display = 'none';
                        progressText.textContent = '';
                    }, 2000);
                    document.querySelectorAll('.download-mod-spore-btn, .download-mod-sporega-btn').forEach(b => {
                        b.disabled = false;
                        b.classList.remove('mod-download-disabled');
                    });
                    return;
                }

                setTimeout(async () => {
                    progressBar.style.display = 'none';
                    if (progressFill) progressFill.style.width = '0%';
                    progressText.textContent = '';
                    cleanupListeners(btns);
                    await updateState();
                    btn.style.display = '';
                    document.querySelectorAll('.download-mod-spore-btn, .download-mod-sporega-btn').forEach(b => {
                        b.disabled = false;
                        b.classList.remove('mod-download-disabled');
                    });
                }, 1000);
            }
        };

        updateState();
    });
}

async function updateModButtons() {
    setupModButton('unlock60fps', {
        isInstalled: async (gameType) => window.electronAPI.isUnlock60fpsInstalled(gameType),
        uninstall: async (gameType) => window.electronAPI.uninstallUnlock60fps(gameType),
        download: (url, gameType, installId) => window.electronAPI.downloadModWithProgress(url, gameType, installId),
        unzip: window.electronAPI.unzipMod,
        install: async (extractedPath, zipPath, gameType, installId) =>
            window.electronAPI.installSporemod(extractedPath, zipPath, gameType, installId)
    });
    setupModButton('HDTextures', {
        isInstalled: async (gameType) => window.electronAPI.isHDTexturesInstalled(gameType),
        uninstall: async (gameType) => window.electronAPI.uninstallHDTextures(gameType),
        download: (url, gameType, installId) => window.electronAPI.downloadModWithProgress(url, gameType, installId),
        unzip: window.electronAPI.unzipMod,
        install: async (extractedPath, zipPath, gameType, installId) =>
            window.electronAPI.installHDTextures(extractedPath, zipPath, gameType, installId)
    });
    setupModButton('4gbpatch', {
        isInstalled: async (gameType) => window.electronAPI.is4gbPatchInstalled(gameType),
        uninstall: async (gameType) => window.electronAPI.uninstall4gbPatch(gameType),
        download: (url, gameType, installId) => window.electronAPI.downloadModWithProgress(url, gameType, installId),
        unzip: window.electronAPI.unzipMod,
        install: async (extractedPath, zipPath, gameType, installId) =>
            window.electronAPI.install4gbPatch(extractedPath, zipPath, gameType, installId)
    });
    setupModButton('AllSpicesMaxPrice', {
        isInstalled: async (gameType) => window.electronAPI.isSporemodapiModInstalled('allspicesmaxprice'),
        uninstall: async (gameType) => window.electronAPI.uninstallSporemodapiMod('allspicesmaxprice'),
        download: (url, gameType, installId) => window.electronAPI.downloadModWithProgress(url, gameType, installId),
        unzip: window.electronAPI.unzipMod,
        install: async (extractedPath, zipPath, gameType, installId) =>
            window.electronAPI.installSporemodapiMod('allspicesmaxprice', extractedPath, zipPath, gameType)
    });
    setupModButton('CrashFix', {
        isInstalled: async (gameType) => window.electronAPI.isSporemodapiModInstalled('crashfix'),
        uninstall: async (gameType) => window.electronAPI.uninstallSporemodapiMod('crashfix'),
        download: (url, gameType, installId) => window.electronAPI.downloadModWithProgress(url, gameType, installId),
        unzip: window.electronAPI.unzipMod,
        install: async (extractedPath, zipPath, gameType, installId) =>
            window.electronAPI.installSporemodapiMod('crashfix', extractedPath, zipPath, gameType)
    });
    setupModButton('OnlineFix', {
        isInstalled: async (gameType) => window.electronAPI.isSporemodapiModInstalled('onlinefix'),
        uninstall: async (gameType) => window.electronAPI.uninstallSporemodapiMod('onlinefix'),
        download: (url, gameType, installId) => window.electronAPI.downloadModWithProgress(url, gameType, installId),
        unzip: window.electronAPI.unzipMod,
        install: async (extractedPath, zipPath, gameType, installId) =>
            window.electronAPI.installSporemodapiMod('onlinefix', extractedPath, zipPath, gameType)
    });
    setupModButton('LongerProgressionInSpaceStage', {
        isInstalled: async (gameType) => window.electronAPI.isSporemodapiModInstalled('longerprogressioninspacestage'),
        uninstall: async (gameType) => window.electronAPI.uninstallSporemodapiMod('longerprogressioninspacestage'),
        download: (url, gameType, installId) => window.electronAPI.downloadModWithProgress(url, gameType, installId),
        unzip: window.electronAPI.unzipMod,
        install: async (extractedPath, zipPath, gameType, installId) =>
            window.electronAPI.installSporemodapiMod('longerprogressioninspacestage', extractedPath, zipPath, gameType)
    });
    setupModButton('SellAnyAmount', {
        isInstalled: async (gameType) => window.electronAPI.isSporemodapiModInstalled('sellanyamount'),
        uninstall: async (gameType) => window.electronAPI.uninstallSporemodapiMod('sellanyamount'),
        download: (url, gameType, installId) => window.electronAPI.downloadModWithProgress(url, gameType, installId),
        unzip: window.electronAPI.unzipMod,
        install: async (extractedPath, zipPath, gameType, installId) =>
            window.electronAPI.installSporemodapiMod('sellanyamount', extractedPath, zipPath, gameType)
    });
    setupModButton('EnhancedColorPicker', {
        isInstalled: async (gameType) => window.electronAPI.isSporemodapiModInstalled('enhancedcolorpicker'),
        uninstall: async (gameType) => window.electronAPI.uninstallSporemodapiMod('enhancedcolorpicker'),
        download: (url, gameType, installId) => window.electronAPI.downloadModWithProgress(url, gameType, installId),
        unzip: window.electronAPI.unzipMod,
        install: async (extractedPath, zipPath, gameType, installId) =>
            window.electronAPI.installSporemodapiMod('enhancedcolorpicker', extractedPath, zipPath, gameType)
    });
    setupModButton('DefensiveShipsInPlayerColonies', {
        isInstalled: async (gameType) => window.electronAPI.isSporemodapiModInstalled('defensiveshipsinplayercolonies'),
        uninstall: async (gameType) => window.electronAPI.uninstallSporemodapiMod('defensiveshipsinplayercolonies'),
        download: (url, gameType, installId) => window.electronAPI.downloadModWithProgress(url, gameType, installId),
        unzip: window.electronAPI.unzipMod,
        install: async (extractedPath, zipPath, gameType, installId) =>
            window.electronAPI.installSporemodapiMod('defensiveshipsinplayercolonies', extractedPath, zipPath, gameType)
    });
    setupModButton('TotallyNotACheater', {
        isInstalled: async (gameType) => window.electronAPI.isSporemodapiModInstalled('totallynotacheater'),
        uninstall: async (gameType) => window.electronAPI.uninstallSporemodapiMod('totallynotacheater'),
        download: (url, gameType, installId) => window.electronAPI.downloadModWithProgress(url, gameType, installId),
        unzip: window.electronAPI.unzipMod,
        install: async (extractedPath, zipPath, gameType, installId) =>
            window.electronAPI.installSporemodapiMod('totallynotacheater', extractedPath, zipPath, gameType)
    });
}

window.addEventListener('DOMContentLoaded', async () => {
    const splash = document.getElementById('splash-screen');
    document.body.classList.add('transparent-launcher');
    Array.from(document.body.children).forEach(el => {
        if (el.id !== 'splash-screen') el.style.display = 'none';
    });
    splash.style.display = 'flex';

    await updateModButtons();

    await new Promise(resolve => setTimeout(resolve, 1000));

    document.body.classList.remove('transparent-launcher');
    Array.from(document.body.children).forEach(el => {
        if (el.id !== 'splash-screen') el.style.display = '';
    });
    splash.style.display = 'none';

    document.querySelector('.launcher-header .window-close')?.addEventListener('click', () => window.electronAPI.closeWindow());
    document.getElementById('discord-btn')?.addEventListener('click', () => window.electronAPI.openDiscord());
    document.querySelector('.footer-item img[alt="Kofi"]')?.parentElement.addEventListener('click', () => {
        window.electronAPI.openKofi();
    });
    document.querySelectorAll('.window-maximize').forEach(btn =>
        btn.addEventListener('click', () => window.electronAPI.maximizeWindow())
    );
    document.querySelectorAll('.window-minimize').forEach(btn =>
        btn.addEventListener('click', () => window.electronAPI.minimizeWindow())
    );

    document.getElementById('update-launcher-btn')?.addEventListener('click', async function () {
        if (confirm(currentTranslations.updateConfirm)) {
            this.disabled = true;
            this.textContent = currentTranslations.updatingNow;
            await window.electronAPI.downloadUpdate();
            window.electronAPI.updateLauncher();
        }
    });

    await updateModButtons();

    const searchInput = document.getElementById('mods-search-input');
    if (searchInput) {
        searchInput.addEventListener('input', function () {
            const filter = this.value.trim().toLowerCase();
            document.querySelectorAll('.mods-table tbody tr').forEach(row => {
                const nameCell = row.querySelector('.mod-main-title');
                if (!nameCell) return;
                const modName = nameCell.textContent.trim().toLowerCase();
                row.style.display = modName.includes(filter) ? '' : 'none';
            });
        });
    }

    // --- MODALS TOGGLE LOGIC ---

    const settingsModal = document.getElementById('settings-modal');
    const settingsModalContent = settingsModal?.querySelector('.mods-modal-content');
    const modsModal = document.getElementById('mods-modal');
    const modsModalContent = modsModal?.querySelector('.mods-modal-content');
    const footerMods = document.getElementById('footer-mods');
    const footerSettings = document.getElementById('footer-settings');

    function setFooterActive(tab) {
        document.querySelectorAll('.footer-item').forEach(el => el.classList.remove('active'));
        if (tab === 'mods') {
            footerMods?.classList.add('active');
        } else if (tab === 'settings') {
            footerSettings?.classList.add('active');
        }
    }

    footerMods?.addEventListener('click', () => {
        if (!modsModal.classList.contains('hidden')) {
            modsModal.classList.add('hidden');
            setFooterActive(null);
            return;
        }
        if (settingsModal && !settingsModal.classList.contains('hidden')) {
            settingsModal.classList.add('hidden');
            settingsModal.classList.remove('animating-in', 'animating-out');
            settingsModalContent?.classList.remove('animating-in', 'animating-out');
        }
        modsModal.classList.remove('hidden', 'animating-out');
        modsModal.scrollTop = 0;
        modsModalContent?.scrollTo?.(0, 0);
        modsModal.querySelectorAll('*').forEach(el => {
            if (el.scrollHeight > el.clientHeight) el.scrollTop = 0;
        });
        modsModal.classList.add('animating-in');
        modsModalContent?.classList.remove('animating-out');
        modsModalContent?.classList.add('animating-in');
        setTimeout(() => {
            modsModal.classList.remove('animating-in');
            modsModalContent?.classList.remove('animating-in');
        }, 350);
        setFooterActive('mods');
    });
    footerSettings?.addEventListener('click', () => {
        if (!settingsModal.classList.contains('hidden')) {
            settingsModal.classList.add('hidden');
            setFooterActive(null);
            return;
        }
        if (modsModal && !modsModal.classList.contains('hidden')) {
            modsModal.classList.add('hidden');
            modsModal.classList.remove('animating-in', 'animating-out');
            modsModalContent?.classList.remove('animating-in', 'animating-out');
        }
        settingsModal.classList.remove('hidden', 'animating-out');
        settingsModalContent?.scrollTo?.(0, 0);
        settingsModal.classList.add('animating-in');
        settingsModalContent?.classList.remove('animating-out');
        settingsModalContent?.classList.add('animating-in');
        setTimeout(() => {
            settingsModal.classList.remove('animating-in');
            settingsModalContent?.classList.remove('animating-in');
        }, 350);
        setFooterActive('settings');
    });

    document.getElementById('close-settings-modal')?.addEventListener('click', () => {
        settingsModal?.classList.add('hidden');
        setFooterActive(null);
    });

    document.getElementById('close-mods-modal')?.addEventListener('click', () => {
        modsModal?.classList.add('hidden');
        setFooterActive(null);
    });

    document.querySelector('.play-btn-sporega')?.addEventListener('click', async () => {
        if (!await window.electronAPI.launchSporeModAPI()) alert(currentTranslations.gaLaunchError);
    });
    document.querySelector('.play-btn-spore-base')?.addEventListener('click', async () => {
        if (!await window.electronAPI.launchSporeBase()) alert(currentTranslations.sporeLaunchError);
    });

    const langSelect = document.getElementById('lang-select');
    if (langSelect) {
        langSelect.addEventListener('change', async () => {
            const lang = langSelect.value;
            localStorage.setItem('sporeLang', lang);
            await window.electronAPI.setLanguage(lang);
            await loadLocale(lang);
        });
        langSelect.value = localStorage.getItem('sporeLang') || 'en';
        loadLocale(langSelect.value);
    } else {
        loadLocale('en');
    }
});

async function loadLocale(lang) {
    const localePath = lang === 'es' ? 'locales/es.json' : 'locales/en.json';
    const response = await fetch(localePath);
    if (!response.ok) return;
    const translations = await response.json();
    currentTranslations = translations;
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (!translations[key]) return;
        if (key === 'disclaimerText') {
            el.innerHTML = translations[key];
            return;
        }
        if (['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName)) {
            el.placeholder = translations[key];
        } else if (el.children.length === 0) {
            el.textContent = translations[key];
        } else {
            const span = el.querySelector('span');
            if (span) span.textContent = translations[key];
        }
    });
    const searchInput = document.getElementById('mods-search-input');
    if (searchInput && translations.modsSearchPlaceholder) {
        searchInput.placeholder = translations.modsSearchPlaceholder;
    }
    document.title = translations['title'] || document.title;
    const launcherTitleEl = document.querySelector('.launcher-title');
    if (launcherTitleEl && window.electronAPI.getAppVersion) {
        launcherTitleEl.textContent = currentTranslations.launcherTitle || 'Spore NEXT Launcher';
        window.electronAPI.getAppVersion().then(version => {
            launcherTitleEl.innerHTML += ` <span style="color:#aaa;font-size:0.85em;">v${version}</span>`;
        });
    }
    const updatedTextEl = document.querySelector('[data-i18n="updatedText"]');
    if (updatedTextEl && newVersionAvailable) {
        updatedTextEl.innerHTML = `${currentTranslations.updateAvailableText} <br><span style="color:#aaa;">${currentTranslations.newVersionLabel || 'Nueva versión:'} v${newVersionAvailable}</span>`;
    }

    sortModsTable();
}

window.electronAPI.onUpdateAvailable((_, version) => {
    newVersionAvailable = version;
    const updatedTextEl = document.querySelector('[data-i18n="updatedText"]');
    if (updatedTextEl) {
        updatedTextEl.innerHTML = `${currentTranslations.updateAvailableText} <br><span style="color:#aaa;">${currentTranslations.newVersionLabel || 'New version:'} v${version}</span>`;
    }
    const updateBtn = document.getElementById('update-launcher-btn');
    if (updateBtn) updateBtn.style.display = 'block';
});
window.electronAPI.onUpdateDownloaded?.(() => {
    const updateBtn = document.getElementById('update-launcher-btn');
    if (updateBtn) updateBtn.style.display = 'block';
    const updatedTextEl = document.querySelector('[data-i18n="updatedText"]');
    if (updatedTextEl) {
        let versionInfo = newVersionAvailable ? `<br><span style="color:#aaa;">${currentTranslations.newVersionLabel || 'New version:'} v${newVersionAvailable}</span>` : '';
        updatedTextEl.innerHTML = currentTranslations.updateAvailableText + versionInfo;
    }
});

if (window.require) {
    const { ipcRenderer } = window.require('electron');
    ipcRenderer.on('download-mod-error', (_event, message) => {
        alert('Error al descargar el mod:\n' + message);
    });
}

document.getElementById('extra-action-btn')?.addEventListener('click', async () => {
    if (confirm(currentTranslations.uninstallAllConfirm || "¿Seguro que quieres desinstalar todos los mods?")) {
        const success = await window.electronAPI.uninstallAllMods();
        await updateModButtons();
        if (success) {
            alert(currentTranslations.uninstallAllSuccess || "Todos los mods han sido desinstalados.");
        } else {
            alert(currentTranslations.uninstallAllNone || "No había mods instalados para desinstalar.");
        }
    }
});

function sortModsTable() {
    document.querySelectorAll('.mods-table').forEach(table => {
        const categoryOrder = {
            'optimization': 1,
            'textures': 2,
            'overhaul': 3
        };

        let allRows = [];
        table.querySelectorAll('tbody tr').forEach(row => {
            allRows.push(row);
        });

        allRows.sort((a, b) => {
            const catA = a.getAttribute('data-category') || '';
            const catB = b.getAttribute('data-category') || '';
            const orderA = categoryOrder[catA] || 99;
            const orderB = categoryOrder[catB] || 99;
            if (orderA !== orderB) return orderA - orderB;
            const nameA = (a.querySelector('.mod-main-title')?.textContent || '').trim().toLowerCase();
            const nameB = (b.querySelector('.mod-main-title')?.textContent || '').trim().toLowerCase();
            return nameA.localeCompare(nameB, 'en');
        });

        table.querySelectorAll('tbody').forEach(tbody => {
            while (tbody.firstChild) tbody.removeChild(tbody.firstChild);
        });

        allRows.forEach(row => {
            const cat = row.getAttribute('data-category');
            let targetTbody = Array.from(table.querySelectorAll('tbody')).find(tb =>
                tb.querySelector(`tr[data-category="${cat}"]`)
            ) || table.querySelector('tbody');
            targetTbody.appendChild(row);
        });
    });
}

document.addEventListener('click', function (e) {
    const target = e.target.closest('a[data-external]');
    if (target) {
        e.preventDefault();
        window.electronAPI.openExternal(target.href);
    }
});