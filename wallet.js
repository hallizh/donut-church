// wallet.js — shared wallet connect banner for donut.church
// Exposes window.DONUT_WALLET

(function () {
  const STORAGE_KEY = 'donut_wallet_last';

  const state = {
    address: null,
  };

  function short(addr) {
    if (!addr) return 'Not connected';
    return 'Connected: ' + addr.slice(0, 6) + '…' + addr.slice(-4);
  }

  function setAddress(addr) {
    state.address = addr || null;
    try {
      if (state.address) localStorage.setItem(STORAGE_KEY, state.address);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {}

    document.querySelectorAll('[data-wallet-status]').forEach((el) => {
      el.textContent = short(state.address);
    });
  }

  async function connect() {
    if (!window.ethereum) {
      // In many in-app browsers (Telegram, etc.) MetaMask is not injected.
      document.querySelectorAll('[data-wallet-status]').forEach((el) => {
        el.textContent = 'No wallet provider (install MetaMask / use MetaMask browser)';
      });
      try { alert('No wallet detected. Install MetaMask or open this site inside a wallet browser.'); } catch {}
      return null;
    }
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    setAddress(accounts?.[0] || null);
    return state.address;
  }

  function initBanner() {
    const run = () => {
      console.log('[DONUT_WALLET] initBanner');

      // Restore last-known address (display only; real dapp still needs provider)
      try {
        const last = localStorage.getItem(STORAGE_KEY);
        if (last) setAddress(last);
        else setAddress(null);
      } catch {
        setAddress(null);
      }

      document.querySelectorAll('[data-wallet-connect]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          try {
            btn.disabled = true;
            const old = btn.textContent;
            btn.textContent = 'Connecting…';
            await connect();
            btn.textContent = old;
            btn.disabled = false;
          } catch (e) {
            console.error(e);
            try { alert('Wallet connection failed: ' + (e?.message || e)); } catch {}
            btn.disabled = false;
            btn.textContent = '🔌 Connect Wallet';
          }
        });
      });

      if (window.ethereum?.on) {
        window.ethereum.on('accountsChanged', (accs) => setAddress(accs?.[0] || null));
      }
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', run);
    } else {
      run();
    }
  }

  window.DONUT_WALLET = {
    initBanner,
    connect,
    getAddress: () => state.address,
  };
})();
