// wallet.js — Church of Donut shared wallet banner + state
// Goal: one connect flow across pages, robust on MetaMask Mobile.
// Exposes: window.DONUT_WALLET = { connect, disconnect, getAddress, ensureConnected, onChange }

(function () {
  const STORAGE_KEY = 'donut_wallet_last';
  let address = null;
  let inFlight = false;
  const listeners = new Set();

  function short(addr) {
    return addr ? (addr.slice(0, 6) + '…' + addr.slice(-4)) : 'Not connected';
  }

  function emit() {
    for (const fn of listeners) {
      try { fn(address); } catch (e) { console.error('[DONUT_WALLET] listener error', e); }
    }
    try {
      window.dispatchEvent(new CustomEvent('donut:wallet', { detail: { address } }));
    } catch {}
  }

  function setAddress(addr) {
    address = addr || null;
    try {
      if (address) localStorage.setItem(STORAGE_KEY, address);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {}

    // Update any banner instances
    document.querySelectorAll('[data-donut-wallet-status]').forEach((el) => {
      el.textContent = address ? ('Connected: ' + short(address)) : 'Not connected';
    });
    document.querySelectorAll('[data-donut-wallet-connect]').forEach((el) => {
      el.style.display = address ? 'none' : '';
    });
    document.querySelectorAll('[data-donut-wallet-disconnect]').forEach((el) => {
      el.style.display = address ? '' : 'none';
    });

    emit();
  }

  async function connect() {
    if (inFlight) throw new Error('Wallet connect already pending. Check MetaMask.');
    if (!window.ethereum) throw new Error('No wallet provider found (window.ethereum missing).');

    inFlight = true;
    // Banner feedback (if present)
    document.querySelectorAll('[data-donut-wallet-status]').forEach((el) => {
      el.textContent = 'Connecting…';
    });

    try {
      // If already authorized, avoid triggering permission flow twice.
      let accounts = [];
      try { accounts = await window.ethereum.request({ method: 'eth_accounts' }); } catch {}
      if (!accounts || accounts.length === 0) {
        accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      }
      const addr = accounts?.[0] || null;
      setAddress(addr);
      return addr;
    } finally {
      inFlight = false;
    }
  }

  function disconnect() {
    // Dapps can't force MetaMask to forget permissions; we only clear local UI state.
    setAddress(null);
  }

  async function ensureConnected() {
    if (address && address.startsWith('0x')) return address;
    return await connect();
  }

  function onChange(fn) {
    listeners.add(fn);
    // call immediately
    try { fn(address); } catch {}
    return () => listeners.delete(fn);
  }

  function injectBanner() {
    // If the page already has one, do nothing.
    if (document.querySelector('[data-donut-wallet-banner]')) return;

    const banner = document.createElement('div');
    banner.setAttribute('data-donut-wallet-banner', '1');
    banner.style.cssText = [
      'position:sticky',
      'top:0',
      'z-index:999',
      'padding:12px 16px',
      'background:rgba(0,0,0,0.35)',
      'backdrop-filter: blur(8px)',
      'border-bottom:1px solid rgba(244,208,63,0.25)'
    ].join(';');

    banner.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">
        <div style="font-weight:700;letter-spacing:0.2px;">🍩 Church Wallet</div>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
          <span data-donut-wallet-status style="opacity:0.9; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;">Not connected</span>
          <button data-donut-wallet-connect type="button" style="cursor:pointer; border:none; border-radius:999px; padding:10px 14px; font-weight:700; background: linear-gradient(135deg, #f4d03f 0%, #d4ac0d 100%); color:#1a0a2e;">Connect</button>
          <button data-donut-wallet-disconnect type="button" style="display:none; cursor:pointer; border:1px solid rgba(244,208,63,0.35); border-radius:999px; padding:10px 12px; font-weight:700; background: rgba(255,255,255,0.06); color:#fefefe;">⏏</button>
        </div>
      </div>
    `;

    // Insert at top of body
    const body = document.body;
    if (body.firstChild) body.insertBefore(banner, body.firstChild);
    else body.appendChild(banner);

    // Hook buttons
    const connectBtn = banner.querySelector('[data-donut-wallet-connect]');
    const disconnectBtn = banner.querySelector('[data-donut-wallet-disconnect]');

    connectBtn.addEventListener('click', async () => {
      try {
        connectBtn.disabled = true;
        await connect();
      } catch (e) {
        const msg = e?.message || String(e);
        banner.querySelector('[data-donut-wallet-status]').textContent = 'Wallet error: ' + msg.slice(0, 80);
        try { alert('Wallet error: ' + msg); } catch {}
      } finally {
        connectBtn.disabled = false;
      }
    });

    disconnectBtn.addEventListener('click', () => disconnect());

    // Restore last-known address (display only)
    try {
      const last = localStorage.getItem(STORAGE_KEY);
      if (last && !address) setAddress(last);
      else setAddress(address);
    } catch {
      setAddress(address);
    }
  }

  function init() {
    injectBanner();

    // Keep in sync with MetaMask account changes
    if (window.ethereum?.on) {
      window.ethereum.on('accountsChanged', (accs) => setAddress(accs?.[0] || null));
    }
  }

  window.DONUT_WALLET = { connect, disconnect, getAddress: () => address, ensureConnected, onChange, init };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
