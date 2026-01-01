import React, { createContext, useContext, useState, useEffect } from "react";

const LocaleContext = createContext();

export function LocaleProvider({ children }) {
  const [locale, setLocale] = useState(() => {
    return localStorage.getItem("locale") || "en";
  });
  const [messages, setMessages] = useState({});

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}locales/${locale}.json`)
      .then((res) => res.json())
      .then(setMessages)
      .catch(() => setMessages({}));
  }, [locale]);

  const t = (key) => messages[key] || key;

  useEffect(() => {
    try {
      window.__localeT = t;
    } catch {}
  }, [locale, messages]);

  const changeLocale = (lng) => {
    setLocale(lng);
    localStorage.setItem("locale", lng);
  };

  return (
    <LocaleContext.Provider value={{ locale, setLocale: changeLocale, t }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}
