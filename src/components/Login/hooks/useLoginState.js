import { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useLanguage } from '../../../context/LanguageContext';
import { validatePassword } from '../../../utils/validationHelper';

export function useLoginState() {
  const { loginWithDiscord, loginWithGithub, loginWithEmail, registerWithEmail, verifySignupOtp, resetPassword, verifyRecoveryOtp, loginOffline, isNetworkOnline } = useAuth();
  const { t } = useLanguage();
  const [isForgotPasswordMode, setIsForgotPasswordMode] = useState(false);
  const [isOtpMode, setIsOtpMode] = useState(false);
  const [otpType, setOtpType] = useState('recovery');
  const [isRegistering, setIsRegistering] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');



  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    try {
      if (isRegistering) {
        if (!username) return setErrorMsg(t('login.usernameReq'));
        if (password !== confirmPassword) return setErrorMsg(t('login.passwordMismatch'));

        const pwdError = validatePassword(password, t);
        if (pwdError) return setErrorMsg(pwdError);

        const data = await registerWithEmail(email, password, username);
        if (data && !data.session) {
          setSuccessMsg(t('login.signupConfirmationSent'));
          setOtpType('signup');
          setIsOtpMode(true);
        }
      } else {
        await loginWithEmail(email, password);
      }
    } catch (err) {
      if (err.message && err.message.includes('Database error saving new user')) {
        setErrorMsg(t('login.usernameTaken'));
      } else {
        setErrorMsg(err.message);
      }
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (otpType === 'signup') {
      if (!otpCode) return setErrorMsg(t('login.fillAllFields'));
      try {
        await verifySignupOtp(email, otpCode);
        setSuccessMsg(t('login.signupVerified'));
      } catch (err) {
        setErrorMsg(err.message);
      }
    } else {
      if (!otpCode || !password) return setErrorMsg(t('login.fillAllFields'));

      const pwdError = validatePassword(password, t);
      if (pwdError) return setErrorMsg(pwdError);

      try {
        await verifyRecoveryOtp(email, otpCode, password);
      } catch (err) {
        if (err.message && err.message.toLowerCase().includes('different from the old password')) {
          setErrorMsg(t('login.otpErrorDifferentPassword') || err.message);
        } else {
          setErrorMsg(err.message);
        }
      }
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    if (!email) {
      return setErrorMsg(t('login.enterEmailError'));
    }
    try {
      await resetPassword(email);
      setSuccessMsg(t('login.codeSent'));
      setOtpType('recovery');
      setIsOtpMode(true);
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleCancel = () => {
    setIsOtpMode(false);
    setIsForgotPasswordMode(false);
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setUsername('');
    setOtpCode('');
    setErrorMsg('');
    setSuccessMsg('');
  };

  return {
    loginWithDiscord,
    loginWithGithub,
    loginOffline,
    isNetworkOnline,
    t,
    isForgotPasswordMode, setIsForgotPasswordMode,
    isOtpMode, setIsOtpMode,
    otpType, setOtpType,
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
  };
}
