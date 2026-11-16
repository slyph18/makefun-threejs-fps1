// A DOM-only buy overlay shown during the buy phase. It reads game state and applies one
// purchase per click; simulation and rendering remain in main.js's fixed-step loop.

const ITEMS = [
  { kind: 'weapon', id: 'pistol', label: 'Pistol', cost: 0, detail: 'Reliable sidearm' },
  { kind: 'weapon', id: 'rifle', label: 'Rifle', cost: 2700, detail: 'Fast automatic fire' },
  { kind: 'weapon', id: 'marksman', label: 'Marksman', cost: 4600, detail: 'High damage, slow fire' },
  { kind: 'grenade', id: 'frag', label: 'Frag Grenade', cost: 300, detail: '2 per round' },
  { kind: 'armor', id: 'armor', label: 'Armor', cost: 650, detail: 'Halves incoming damage' },
];

const GRENADE_LIMIT = 2;

function applyPurchase(item, arsenal) {
  if (item.kind === 'weapon') {
    arsenal.buyWeapon(item.id);
    return;
  }
  if (item.kind === 'armor') {
    arsenal.buyArmor();
    return;
  }
  arsenal.buyGrenade();
}

export function createBuyMenu({ arsenal, economy, onClose }) {
  const menu = document.createElement('section');
  menu.className = 'buy-menu';
  menu.hidden = true;
  menu.setAttribute('role', 'dialog');
  menu.setAttribute('aria-modal', 'true');
  menu.setAttribute('aria-labelledby', 'buy-title');
  menu.innerHTML = `
    <header>
      <div>
        <h2 id="buy-title">Buy Equipment</h2>
        <p>Available only during the buy phase.</p>
      </div>
      <button class="buy-close" type="button">Close</button>
    </header>
    <div class="buy-items"></div>
  `;
  document.body.appendChild(menu);

  const itemsHost = menu.querySelector('.buy-items');
  const closeButton = menu.querySelector('.buy-close');
  const moneyValue = document.createElement('span');
  moneyValue.className = 'buy-money-value';
  menu.querySelector('header div').appendChild(moneyValue);
  const buttons = new Map();

  for (const item of ITEMS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.id = item.id;
    button.innerHTML = `
      <span class="buy-name">${item.label}</span>
      <span class="buy-detail">${item.detail}</span>
      <span class="buy-cost">$${item.cost}</span>
    `;
    button.addEventListener('click', () => purchase(item));
    itemsHost.appendChild(button);
    buttons.set(item.id, button);
  }

  function isEligible(item) {
    if (item.kind === 'grenade') return arsenal.state.grenades < GRENADE_LIMIT;
    if (item.kind === 'armor') return !arsenal.state.armor;
    return !arsenal.state.owned[item.id];
  }

  function canPurchase(item) {
    return economy.state.money >= item.cost && isEligible(item);
  }

  function purchase(item) {
    if (!canPurchase(item) || !economy.spend(item.cost)) return false;
    applyPurchase(item, arsenal);
    render();
    return true;
  }

  function render() {
    moneyValue.textContent = `Funds: $${economy.state.money}`;
    for (const item of ITEMS) {
      const button = buttons.get(item.id);
      const affordable = canPurchase(item);
      button.disabled = !affordable;
      button.setAttribute('aria-disabled', affordable ? 'false' : 'true');
      button.dataset.affordable = affordable ? 'true' : 'false';

      if (item.kind === 'weapon') {
        button.dataset.owned = arsenal.state.owned[item.id] ? 'true' : 'false';
        button.dataset.active = arsenal.state.active === item.id ? 'true' : 'false';
      }
    }
  }

  function close() {
    if (menu.hidden) return;
    menu.hidden = true;
    onClose();
  }

  function open() {
    if (!menu.hidden) return;
    render();
    menu.hidden = false;
    closeButton.focus();
  }

  menu.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' || event.key === 'b' || event.key === 'B') {
      event.preventDefault();
      close();
    }
  });

  return {
    isOpen() {
      return !menu.hidden;
    },
    open,
    close,
    toggle() {
      if (menu.hidden) open();
      else close();
    },
  };
}
