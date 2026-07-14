const path = require('path');
const fs = require('fs');
const http = require('http');
const { state } = require('./state.cjs');

function handleDeepLink(urlStr) {
  try {
    const hashIndex = urlStr.indexOf('#');
    if (hashIndex === -1) return;
    const hash = urlStr.substring(hashIndex + 1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (accessToken && state.mainWindow) {
      const now = Date.now();

      if (accessToken === state.lastProcessedToken && now - state.lastProcessedTime < 3000) {
        console.log('[Auth] Duplicate token detected, ignoring deep link spam.');
        return;
      }
      state.lastProcessedToken = accessToken;
      state.lastProcessedTime = now;

      state.mainWindow.webContents.send('discord-login-success', { accessToken, refreshToken });
    }
  } catch (err) {
    console.error('Error handling deep link:', err);
  }
}

function startAuthServer() {

  let logoBase64 = '';
  try {
    let logoPath = path.join(__dirname, '..', 'dist', 'logo.png');
    if (!fs.existsSync(logoPath)) {
      logoPath = path.join(__dirname, '..', 'public', 'logo.png');
    }
    if (fs.existsSync(logoPath)) {
      const data = fs.readFileSync(logoPath);
      logoBase64 = `data:image/png;base64,${data.toString('base64')}`;
    }
  } catch (err) {
    console.error('Failed to read logo for auth server:', err);
  }

  const port = 4242;
  state.authServer = http.createServer((req, res) => {
    let reqUrl;
    try {
      reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    } catch (err) {
      res.writeHead(400);
      res.end('Invalid URL');
      return;
    }

    if (reqUrl.pathname === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Spore NEXT Auth</title>
          <style>
            body {
              margin: 0;
              padding: 0;
            }
            .fallback-container {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              width: 100vw;
              height: 100vh;
              background-color: #121019;
              color: #ffffff;
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              text-align: center;
              padding: 20px;
              box-sizing: border-box;
            }
            .fallback-logo {
              width: 96px;
              height: 96px;
              margin-bottom: 24px;
              user-select: none;
              -webkit-user-drag: none;
            }
            .fallback-container, .fallback-container * {
              user-select: none;
              -webkit-user-select: none;
              -moz-user-select: none;
              -ms-user-select: none;
            }
            .fallback-title {
              font-size: 2.2rem;
              margin-bottom: 12px;
              font-weight: 800;
              background: linear-gradient(135deg, #ffffff, #c2b5e2);
              -webkit-background-clip: text;
              background-clip: text;
              -webkit-text-fill-color: transparent;
              letter-spacing: -0.5px;
            }
            .fallback-text {
              color: #9b99a4;
              font-size: 0.95rem;
              max-width: 450px;
              line-height: 1.6;
              margin-bottom: 28px;
            }
            .fallback-btn {
              display: inline-block;
              font-weight: 600;
              font-size: 0.95rem;
              padding: 12px 32px;
              border-radius: 8px;
              text-decoration: none;
              background: rgba(126, 90, 224, 0.15);
              color: #a988f0;
              border: 1px solid rgba(126, 90, 224, 0.25);
              transition: all 0.2s ease;
              -webkit-user-drag: none;
            }
            .fallback-btn:hover {
              background: rgba(126, 90, 224, 0.28);
              color: #c4aaff;
              border-color: rgba(126, 90, 224, 0.4);
            }
            .fallback-btn.disabled {
              background: rgba(126, 90, 224, 0.05);
              color: rgba(169, 136, 240, 0.4);
              border-color: rgba(126, 90, 224, 0.1);
              cursor: not-allowed;
              pointer-events: none;
            }
          </style>
        </head>
        <body>
          <div class="fallback-container">
            <img src="${logoBase64}" class="fallback-logo" draggable="false" alt="Spore NEXT Logo" />
            <h1 class="fallback-title" id="title">Logging in...</h1>
            <p class="fallback-text" id="desc">Please wait while we transfer your credentials to the launcher.</p>
            <p class="fallback-text" id="subdesc" style="display: none; font-size: 0.85rem; color: rgba(255, 255, 255, 0.4); margin-bottom: 24px; margin-top: -12px;">
              If the launcher did not open automatically, click the button below to return to the app.
            </p>
            <a href="#" id="action-btn" class="fallback-btn" style="display: none;" draggable="false">Open Spore NEXT</a>
          </div>
          <script>
            const hash = window.location.hash.substring(1);
            const params = new URLSearchParams(hash);
            const accessToken = params.get('access_token');
            const actionBtn = document.getElementById('action-btn');
            
            const appUrl = accessToken ? 'sporenext://auth/#' + hash : 'sporenext://';
            window.location.href = appUrl;
            actionBtn.href = appUrl;
            actionBtn.style.display = 'inline-block';
            
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
                  const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
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
              ? 'Connected your ' + providerName + ' account to <strong>Spore NEXT</strong>'
              : 'Connected your account to <strong>Spore NEXT</strong>';
            
            document.getElementById('title').innerHTML = titleText;
            document.getElementById('desc').innerText = 'You can close this window and go back to Spore NEXT.';
            document.getElementById('subdesc').style.display = 'block';
            
            actionBtn.addEventListener('click', (e) => {
              if (actionBtn.classList.contains('disabled')) {
                e.preventDefault();
                return;
              }
              actionBtn.classList.add('disabled');
              actionBtn.innerText = 'Opening launcher...';
              
              setTimeout(() => {
                actionBtn.classList.remove('disabled');
                actionBtn.innerText = 'Open Spore NEXT';
              }, 4000);
            });
          </script>
        </body>
        </html>
      `);
      return;
    }

    res.writeHead(404);
    res.end();
  });

  state.authServer.on('error', (err) => {
    console.error('Auth server error:', err);
  });

  state.authServer.listen(port, '127.0.0.1');
}

module.exports = {
  handleDeepLink,
  startAuthServer
};
