(() => {
  const OLD_LOGO = '/brand/rutinko-logo.webp';
  const NEW_LOGO = '/brand/rutinko-logo.svg';

  function replaceLogo() {
    document.querySelectorAll('img').forEach((image) => {
      const src = image.getAttribute('src') || '';
      if (!src.includes(OLD_LOGO)) return;
      image.setAttribute('src', NEW_LOGO);
      image.classList.add('rutinkoCleanLogo');
    });
  }

  window.addEventListener('load', replaceLogo);
  window.addEventListener('pageshow', replaceLogo);
  document.addEventListener('visibilitychange', replaceLogo);
  window.setTimeout(replaceLogo, 100);
  window.setTimeout(replaceLogo, 500);
})();
