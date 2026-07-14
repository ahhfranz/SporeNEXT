import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './browser-fallback.css'
import App from './App.jsx'

const isElectron = navigator.userAgent.toLowerCase().includes('electron') && window.electronAPI !== undefined;
const isDevBypass = import.meta.env.DEV && (window.location.search.includes('bypass') || window.location.search.includes('dev'));

if (!isElectron && !isDevBypass) {
  const hash = window.location.hash.substring(1);
  const params = new URLSearchParams(hash);
  const accessToken = params.get('access_token');

  const appUrl = accessToken ? `sporenext://auth/#${hash}` : `sporenext://`;
  window.location.href = appUrl;

  let providerName = '';
  const urlParams = new URLSearchParams(window.location.search);
  const provParam = urlParams.get('provider');

  if (provParam) {
    const provLower = provParam.toLowerCase();
    if (provLower === 'github') providerName = 'GitHub';
    else if (provLower === 'discord') providerName = 'Discord';
    else if (provLower === 'email') providerName = 'Email';
    else providerName = provParam.charAt(0).toUpperCase() + provParam.slice(1);
  } else if (accessToken) {
    providerName = 'account';
    try {
      const tokenParts = accessToken.split('.');
      if (tokenParts.length > 1) {
        const base64Url = tokenParts[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        const payload = JSON.parse(jsonPayload);
        if (payload.app_metadata && payload.app_metadata.provider) {
          const prov = payload.app_metadata.provider.toLowerCase();
          if (prov === 'github') providerName = 'GitHub';
          else if (prov === 'discord') providerName = 'Discord';
          else if (prov === 'email') providerName = 'Email';
          else providerName = prov;
        }
      }
    } catch (e) {
      console.warn('Failed to parse provider from token:', e);
    }
  }

  const titleText = providerName
    ? `Connected your ${providerName} account to <strong>Spore NEXT</strong>`
    : `Connected your account to <strong>Spore NEXT</strong>`;

  document.getElementById('root').innerHTML = `
    <div class="fallback-container">
      <img src="/src/assets/logo.png" class="fallback-logo" draggable="false" alt="Spore NEXT Logo" />
      <h1 class="fallback-title">
        ${titleText}
      </h1>
      <p class="fallback-text">
        You can close this window and go back to Spore NEXT.
      </p>
      <p class="fallback-text" style="font-size: 0.85rem; color: rgba(255, 255, 255, 0.4); margin-top: -12px; margin-bottom: 24px;">
        If the launcher did not open automatically, click the button below to return to the app.
      </p>
      <a href="${appUrl}" class="fallback-btn" id="action-btn" draggable="false">
        Open Spore NEXT
      </a>
    </div>
  `;

  const actionBtn = document.getElementById('action-btn');
  if (actionBtn) {
    actionBtn.addEventListener('click', (e) => {
      if (actionBtn.classList.contains('disabled')) {
        e.preventDefault();
        return;
      }
      actionBtn.classList.add('disabled');
      actionBtn.innerText = 'Opening launcher...';
      actionBtn.style.opacity = '0.5';
      actionBtn.style.pointerEvents = 'none';

      setTimeout(() => {
        actionBtn.classList.remove('disabled');
        actionBtn.innerText = 'Open Spore NEXT';
        actionBtn.style.opacity = '1';
        actionBtn.style.pointerEvents = 'auto';
      }, 4000);
    });
  }
} else {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
