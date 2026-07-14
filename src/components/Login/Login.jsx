import React from 'react';
import { Eye, EyeOff, Info } from 'lucide-react';
import './Login.css';
import appLogo from '../../assets/logo.png';
import { useLoginState } from './hooks/useLoginState';
import WindowControls from '../WindowControls/WindowControls';

const Login = () => {
  const {
    loginWithDiscord,
    loginWithGithub,
    loginOffline,
    isNetworkOnline,
    t,
    isForgotPasswordMode, setIsForgotPasswordMode,
    isOtpMode,
    otpType,
    isRegistering, setIsRegistering,
    showPassword, setShowPassword,
    email, setEmail,
    password, setPassword,
    otpCode, setOtpCode,
    confirmPassword, setConfirmPassword,
    username, setUsername,
    errorMsg, setErrorMsg,
    successMsg, setSuccessMsg,
    handleSubmit,
    handleVerifyOtp,
    handleForgotPassword,
    handleCancel,
  } = useLoginState();

  return (
    <div className="login-container mock-bg">
      <div className="login-drag-area" />

      {/* window controls */}
      <WindowControls className="login-window-controls" />

      <div className="login-box animate-fade">
        <h1 className="login-head">
          <img src={appLogo} alt="Logo" className="login-head-logo" />
          <span>
            {isForgotPasswordMode
              ? t('login.forgotPasswordTitle')
              : isRegistering ? t('login.registerFor') : t('login.logInTo')}
            {!isForgotPasswordMode && <span className="brand-text">Spore NEXT</span>}
          </span>
        </h1>

        <p className="login-subtext">
          {isOtpMode
            ? t('login.enterOtpSub')
            : isForgotPasswordMode
              ? t('login.forgotPasswordSub')
              : <>{t('login.youNeedTo')}<strong>{isRegistering ? t('login.registerAct') : t('login.logInAct')}</strong>{t('login.beforeContinuing')}</>}
        </p>

        {!isNetworkOnline && <div className="error-banner">{t('errors.networkError')}</div>}
        {errorMsg && <div className="error-banner">{errorMsg}</div>}
        {successMsg && <div className="error-banner" style={{ background: 'rgba(60, 255, 60, 0.1)', borderColor: '#3cff3c', color: '#55ff55' }}>{successMsg}</div>}

        {isOtpMode ? (
          <form className="login-form" onSubmit={handleVerifyOtp}>
            <div className="input-group">
              <input
                type="text"
                placeholder={t('login.sixDigitCode')}
                value={otpCode}
                onChange={e => setOtpCode(e.target.value.trim())}
                required
                maxLength={6}
                style={{ letterSpacing: '4px', textAlign: 'center', fontWeight: 'bold' }}
              />
            </div>

            {otpType !== 'signup' && (
              <div className="input-group">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder={t('login.newPassword')}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="eye-btn"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            )}

            <button type="submit" className="submit-btn" style={{ marginBottom: '10px' }} disabled={!isNetworkOnline}>
              {t('login.confirmAndEnter')}
            </button>
            <button
              type="button"
              className="cancel-btn"
              onClick={handleCancel}
            >
              {t('login.cancel')}
            </button>
          </form>
        ) : isForgotPasswordMode ? (
          <form className="login-form" onSubmit={handleForgotPassword}>
            <div className="input-group">
              <input
                type="text"
                placeholder={t('login.email')}
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="submit-btn" style={{ marginBottom: '10px' }} disabled={!isNetworkOnline}>
              {t('login.sendResetLink')}
            </button>
            <button
              type="button"
              className="cancel-btn"
              onClick={handleCancel}
            >
              {t('login.cancel')}
            </button>
          </form>
        ) : (
          <>
            <form className="login-form" onSubmit={handleSubmit}>
              {isRegistering && (
                <div className="input-group">
                  <input
                    type="text"
                    placeholder={t('login.username')}
                    value={username}
                    onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    required
                  />
                </div>
              )}

              <div className="input-group">
                <input
                  type="text"
                  placeholder={isRegistering ? t('login.email') : t('login.emailOrUsername')}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="input-group">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder={t('login.password')}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="eye-btn"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {isRegistering && (
                <div className="input-group">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder={t('login.confirmPassword')}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              )}

              {!isRegistering && (
                <div className="forgot-password">
                  <Info size={16} />
                  <span>
                    {t('login.forgotYour')}
                    <a href="#" onClick={(e) => {
                      e.preventDefault();
                      setIsForgotPasswordMode(true);
                      setEmail('');
                      setPassword('');
                      setConfirmPassword('');
                      setUsername('');
                      setErrorMsg('');
                      setSuccessMsg('');
                    }}>
                      {t('login.passwordQ')}
                    </a>
                  </span>
                </div>
              )}

              <button type="submit" className="submit-btn" disabled={!isNetworkOnline}>
                {isRegistering ? t('login.registerBtn') : t('login.logInBtn')}
              </button>
            </form>

            <div className="toggle-mode">
              {isRegistering ? t('login.alreadyHave') : t('login.needAccount')}
              <button type="button" className="link-btn" onClick={() => {
                setIsRegistering(!isRegistering);
                setEmail('');
                setPassword('');
                setConfirmPassword('');
                setUsername('');
                setErrorMsg('');
                setSuccessMsg('');
              }}>
                {isRegistering ? t('login.logInHere') : t('login.registerHere')}
              </button>
            </div>

            <div className="divider">
              <span>{t('login.orLoginWith')}</span>
            </div>

            <div className="oauth-buttons-row">
              <button className="discord-alt-btn" onClick={loginWithDiscord} disabled={!isNetworkOnline} data-tooltip={t('login.loginWithDiscord')}>
                <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                  <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0314a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
                </svg>
              </button>

              <button className="github-alt-btn" onClick={loginWithGithub} type="button" disabled={!isNetworkOnline} data-tooltip={t('login.loginWithGithub')}>
                <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
              </button>
            </div>

            <button className="offline-mode-btn" onClick={loginOffline} type="button">
              {t('login.offlineLoginBtn')}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default Login;
