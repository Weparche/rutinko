(() => {
  const STORAGE_KEY = 'rutinko-notification-nudge-v1';
  const RETRY_DELAY = 80;
  const MAX_RETRIES = 35;

  function canAskForNotifications() {
    return 'Notification' in window && Notification.permission !== 'denied';
  }

  function shouldShowPrompt() {
    if (!canAskForNotifications()) return false;
    if (Notification.permission === 'granted') return false;
    return localStorage.getItem(STORAGE_KEY) !== 'dismissed';
  }

  function clickRutinkoBell(attempt = 0) {
    const button = document.querySelector('[aria-label="Uključi obavijesti"], .headerAction.notify');
    if (button) {
      button.click();
      return;
    }
    if (attempt < MAX_RETRIES) window.setTimeout(() => clickRutinkoBell(attempt + 1), RETRY_DELAY);
  }

  function closePrompt(root) {
    root?.classList.add('isLeaving');
    window.setTimeout(() => root?.remove(), 180);
  }

  function injectStyles() {
    if (document.getElementById('rutinko-notification-nudge-style')) return;
    const style = document.createElement('style');
    style.id = 'rutinko-notification-nudge-style';
    style.textContent = `
      .rutinkoNotifyNudge {
        position: fixed;
        inset: 0;
        z-index: 9999;
        display: grid;
        place-items: end center;
        padding: 18px 14px max(18px, env(safe-area-inset-bottom));
        background: rgba(7, 17, 31, .34);
        backdrop-filter: blur(12px);
        animation: rutinkoNudgeIn .18s ease-out both;
      }

      .rutinkoNotifyNudge.isLeaving {
        animation: rutinkoNudgeOut .18s ease-in both;
      }

      .rutinkoNotifyCard {
        width: min(100%, 480px);
        border-radius: 32px;
        padding: 18px;
        background: linear-gradient(180deg, #ffffff 0%, #f7fbff 100%);
        color: #07111f;
        box-shadow: 0 28px 78px rgba(7, 24, 47, .28);
        border: 1px solid rgba(7, 17, 31, .08);
      }

      .rutinkoNotifyIcon {
        width: 58px;
        height: 58px;
        border-radius: 22px;
        display: grid;
        place-items: center;
        background: rgba(18, 104, 255, .10);
        color: #1268ff;
        font-size: 30px;
        margin-bottom: 12px;
      }

      .rutinkoNotifyCard h2 {
        margin: 0 0 7px;
        font-size: 25px;
        line-height: .98;
        letter-spacing: -.065em;
      }

      .rutinkoNotifyCard p {
        margin: 0;
        color: #647083;
        font-size: 14px;
        line-height: 1.4;
        font-weight: 750;
      }

      .rutinkoNotifyActions {
        display: grid;
        grid-template-columns: 1fr .72fr;
        gap: 9px;
        margin-top: 16px;
      }

      .rutinkoNotifyActions button {
        min-height: 54px;
        border: 0;
        border-radius: 20px;
        font: inherit;
        font-size: 14px;
        font-weight: 950;
        cursor: pointer;
      }

      .rutinkoNotifyAllow {
        background: #b7ff38;
        color: #07111f;
      }

      .rutinkoNotifyLater {
        background: #eef4ff;
        color: #1268ff;
      }

      @keyframes rutinkoNudgeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }

      @keyframes rutinkoNudgeOut {
        from { opacity: 1; transform: translateY(0); }
        to { opacity: 0; transform: translateY(10px); }
      }
    `;
    document.head.appendChild(style);
  }

  function showPrompt() {
    if (!shouldShowPrompt() || document.querySelector('.rutinkoNotifyNudge')) return;
    injectStyles();

    const root = document.createElement('div');
    root.className = 'rutinkoNotifyNudge';
    root.innerHTML = `
      <section class="rutinkoNotifyCard" role="dialog" aria-modal="true" aria-labelledby="rutinkoNotifyTitle">
        <div class="rutinkoNotifyIcon">🔔</div>
        <h2 id="rutinkoNotifyTitle">Uključi Rutinko podsjetnike</h2>
        <p>Da te Rutinko može podsjetiti i kad aplikacija nije otvorena, prvo trebaš dopustiti obavijesti na ovom uređaju.</p>
        <div class="rutinkoNotifyActions">
          <button class="rutinkoNotifyAllow" type="button">Dopusti obavijesti</button>
          <button class="rutinkoNotifyLater" type="button">Kasnije</button>
        </div>
      </section>
    `;

    root.querySelector('.rutinkoNotifyAllow')?.addEventListener('click', async () => {
      localStorage.setItem(STORAGE_KEY, 'dismissed');
      try {
        if ('Notification' in window && Notification.permission === 'default') {
          await Notification.requestPermission();
        }
      } catch {}
      clickRutinkoBell();
      closePrompt(root);
    });

    root.querySelector('.rutinkoNotifyLater')?.addEventListener('click', () => {
      localStorage.setItem(STORAGE_KEY, 'dismissed');
      closePrompt(root);
    });

    document.body.appendChild(root);
  }

  window.addEventListener('load', () => window.setTimeout(showPrompt, 700));
  window.addEventListener('pageshow', () => window.setTimeout(showPrompt, 700));
})();
