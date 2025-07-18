console.log('Renderer loaded');

const sporePathInput = document.getElementById('spore-path');
const sporeErrorMsg = document.createElement('div');
sporeErrorMsg.style.color = 'red';
sporeErrorMsg.style.fontSize = '0.95em';
sporeErrorMsg.style.marginTop = '4px';
sporeErrorMsg.style.display = 'none';
sporePathInput.parentElement.appendChild(sporeErrorMsg);

const gaPathInput = document.getElementById('ga-path');
const gaErrorMsg = document.createElement('div');
gaErrorMsg.style.color = 'red';
gaErrorMsg.style.fontSize = '0.95em';
gaErrorMsg.style.marginTop = '4px';
gaErrorMsg.style.display = 'none';
gaPathInput.parentElement.appendChild(gaErrorMsg);

async function validateSporePath() {
    const folder = sporePathInput.value;
    const isValid = await window.electronAPI.checkSporePath(folder, 'spore');
    if (!isValid) {
        sporeErrorMsg.textContent = currentTranslations.sporePathError || 'Selecciona la carpeta "Data". Ejemplo: ...\\spore\\Data';
        sporeErrorMsg.style.display = 'block';
    } else {
        sporeErrorMsg.style.display = 'none';
    }
}

async function validateGAPath() {
    const folder = gaPathInput.value;
    const isValid = await window.electronAPI.checkSporePath(folder, 'ga');
    if (!isValid) {
        gaErrorMsg.textContent = currentTranslations.gaPathError || 'Selecciona la carpeta "DataEP1". Ejemplo: ...\\spore\\DataEP1';
        gaErrorMsg.style.display = 'block';
    } else {
        gaErrorMsg.style.display = 'none';
    }
}
sporePathInput.addEventListener('change', async () => {
    await window.electronAPI.setSporePath(sporePathInput.value);
    validateSporePath();
});
sporePathInput.addEventListener('input', async () => {
    await window.electronAPI.setSporePath(sporePathInput.value.trim());
    validateSporePath();
});
gaPathInput.addEventListener('change', async () => {
    await window.electronAPI.setGAPath(gaPathInput.value);
    validateGAPath();
});
gaPathInput.addEventListener('input', async () => {
    await window.electronAPI.setGAPath(gaPathInput.value.trim());
    validateGAPath();
});

window.addEventListener('DOMContentLoaded', async () => {
    const closeBtn = document.querySelector('.window-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            window.electronAPI.closeWindow();
        });
    }

    const minimizeBtn = document.querySelector('.window-minimize');
    if (minimizeBtn) {
        minimizeBtn.addEventListener('click', () => {
            window.electronAPI.minimizeWindow();
        });
    }

    const discordBtn = document.getElementById('discord-btn');
    if (discordBtn) {
        discordBtn.addEventListener('click', () => {
            window.electronAPI.openDiscord();
        });
    }

    const installBtn = document.querySelector('.footer-item img[alt="Install Mods"]');
    const modsModal = document.getElementById('mods-modal');
    const settingsBtn = document.querySelector('.footer-item img[alt="Settings"]');
    const settingsModal = document.getElementById('settings-modal');
    const uninstallModsBtn = document.getElementById('uninstall-mods-btn');
    if (uninstallModsBtn) {
        uninstallModsBtn.addEventListener('click', async () => {
            const confirmMsg = currentTranslations.uninstallAllConfirm || '¿Seguro que quieres desinstalar todos los mods?';
            if (!confirm(confirmMsg)) return;
            const result = await window.electronAPI.uninstallAllMods();
            const msg = result
                ? (currentTranslations.uninstallAllSuccess || 'Todos los mods han sido desinstalados.')
                : (currentTranslations.uninstallAllError || 'Error al desinstalar los mods.');
            alert(msg);
        });
    }
    const closeSettingsBtn = document.getElementById('close-settings-modal');

    if (settingsBtn && settingsModal && closeSettingsBtn) {
        settingsBtn.parentElement.addEventListener('click', async () => {
            settingsModal.classList.remove('hidden');
            await loadLocale(localStorage.getItem('sporeLang') || langSelect.value);
            await validateSporePath();
            await validateGAPath();
        });
        closeSettingsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            settingsModal.classList.add('hidden');
        });
    }
    const closeModalBtn = document.getElementById('close-mods-modal');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', (e) => {
            e.preventDefault();
            modsModal.classList.add('hidden');
        });
    }

    if (installBtn && modsModal && closeModalBtn) {
        installBtn.parentElement.addEventListener('click', () => {
            modsModal.classList.remove('hidden');
        });
        closeModalBtn.addEventListener('click', () => {
            modsModal.classList.add('hidden');
        });
    }

    if (sporePathInput && window.electronAPI.detectSporePath) {
        const detectedPath = await window.electronAPI.detectSporePath();
        if (detectedPath) {
            sporePathInput.value = detectedPath;
            await validateSporePath();
        }
    }

    if (gaPathInput && window.electronAPI.detectGAPPath) {
        const detectedGAPath = await window.electronAPI.detectGAPPath();
        if (detectedGAPath) {
            gaPathInput.value = detectedGAPath;
            await validateGAPath();
        }
    }

    const browseSporeBtn = document.getElementById('browse-spore-path');
    if (browseSporeBtn && sporePathInput && window.electronAPI.browseFolder) {
        browseSporeBtn.addEventListener('click', async () => {
            const folder = await window.electronAPI.browseFolder();
            if (folder) {
                sporePathInput.value = folder;
                await validateSporePath();
            }
        });
    }

    const browseGABtn = document.getElementById('browse-ga-path');
    if (browseGABtn && gaPathInput && window.electronAPI.browseFolder) {
        browseGABtn.addEventListener('click', async () => {
            const folder = await window.electronAPI.browseFolder();
            if (folder) {
                gaPathInput.value = folder;
                await validateGAPath();
            }
        });
    }

    document.querySelector('.play-btn-spore').addEventListener('click', async () => {
        const ok = await window.electronAPI.launchSpore();
        if (!ok) alert(currentTranslations.sporeLaunchError || 'No se pudo iniciar Spore. Verifica la ruta en configuración.');
    });

    document.querySelector('.play-btn-ga').addEventListener('click', async () => {
        const ok = await window.electronAPI.launchGA();
        if (!ok) alert(currentTranslations.gaLaunchError || 'No se pudo iniciar Spore GA. Verifica la ruta en configuración.');
    });

    document.querySelectorAll('.install-mod-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            await window.electronAPI.setSporePath(sporePathInput.value.trim());
            await window.electronAPI.setGAPath(gaPathInput.value.trim());

            const target = btn.getAttribute('data-target');
            const progress = btn.parentElement.querySelector('#install-progress');
            const progressBarFill = progress.querySelector('.progress-bar-fill');
            const progressText = progress.querySelector('.progress-text');

            progress.classList.remove('hidden');
            document.querySelectorAll('.install-mod-btn').forEach(b => b.disabled = true);

            progressBarFill.classList.remove('progress-bar-fill-spore', 'progress-bar-fill-sporega');
            if (target === 'spore') {
                progressBarFill.classList.add('progress-bar-fill-spore');
            } else if (target === 'ga') {
                progressBarFill.classList.add('progress-bar-fill-sporega');
            }

            progressText.textContent = currentTranslations.installingLong || 'Instalando... Por favor, no cierres la aplicación durante la instalación.';
            progressBarFill.style.width = '0%';

            window.electronAPI.removeModInstallProgressListeners();

            window.electronAPI.onModInstallProgress((percent) => {
                progressBarFill.style.width = percent + '%';
                if (percent < 50) {
                    progressText.textContent = currentTranslations.downloadingLong || 'Descargando mod...';
                } else {
                    progressText.textContent = currentTranslations.installingLong || 'Instalando...';
                }
            });
            const result = await window.electronAPI.installMod('mod.zip', target);

            progressBarFill.style.width = '100%';
            if (result) {
                progressText.textContent = currentTranslations.installComplete || '¡Instalación completa!';
            } else {
                progressText.textContent = currentTranslations.installError || 'Error al instalar el mod. La ruta de Spore o Galactic Adventures puede ser incorrecta.';
            }
            setTimeout(() => {
                progress.classList.add('hidden');
                document.querySelectorAll('.install-mod-btn').forEach(b => b.disabled = false);
                progressBarFill.style.width = '0%';
                progressText.textContent = currentTranslations.installingLong || 'Instalando... Por favor, no cierres la aplicación durante la instalación.';
            }, 1200);
        });
    });
});

window.addEventListener('keydown', (e) => {
    if (e.key === 'F11') {
        e.preventDefault();
    }
});

let currentTranslations = {};
let currentLang = 'es';

async function loadLocale(lang) {
    const localePath = lang === 'es' ? 'locales/es.json' : 'locales/en.json';
    try {
        const response = await fetch(localePath);
        if (!response.ok) return;
        const translations = await response.json();
        currentTranslations = translations;
        currentLang = lang;
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (translations[key]) {
                if (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') {
                    el.placeholder = translations[key];
                } else {
                    el.innerHTML = translations[key];
                }
            }
        });
        document.title = translations['title'] || document.title;
    } catch (e) {
        console.error('Error loading locale:', e);
    }
}

const langSelect = document.getElementById('lang-select');
if (langSelect) {
    langSelect.addEventListener('change', async () => {
        const lang = langSelect.value;
        localStorage.setItem('sporeLang', lang);
        await loadLocale(lang);

        await validateSporePath();
        await validateGAPath();
    });
    const savedLang = localStorage.getItem('sporeLang') || langSelect.value;
    langSelect.value = savedLang;
    loadLocale(savedLang);
} else {
    loadLocale('es');
}