export const getRedirectUrl = (provider) => {
  if (window.location.hostname === 'localhost' && window.location.port === '5173') {
    return `http://localhost:5173/?provider=${provider}`;
  }
  return `http://localhost:4242/?provider=${provider}`;
};
