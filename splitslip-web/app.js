// ---- State ----
const STORAGE_KEY = 'splitslip-data-v1';

const defaultState = {
  people: ['You', 'Friend'],
  items: [],
  billTitle: '',
  gstRate: 5,
  splitMode: 'proportional',
  paidBy: 'You',
  history: [],
};

let state = loadState();
let newItemAssignees = [];
let nextItemId = Math.max(0, ...state.items.map(i => i.id)) + 1;
let nextHistoryId = Math.max(0, ...state.history.map(b => b.id)) + 1;

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(defaultState);
    return { ...structuredClone(defaultState), ...JSON.parse(raw) };
  } catch (e) {
    console.warn('Failed to load saved data', e);
    return structuredClone(defaultState);
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Failed to save data', e);
  }
}

function fmt(n) {
  const rounded = Math.round((n + Number.EPSILON) * 100) / 100;
  return '₹' + rounded.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ---- Calculations ----
function computeBill() {
  const rate = parseFloat(state.gstRate) || 0;
  const subtotal = state.items.reduce((s, it) => s + it.price, 0);
  const totalTax = (subtotal * rate) / 100;

  const perPerson = {};
  state.people.forEach(p => { perPerson[p] = { items: [], subtotal: 0, tax: 0, total: 0 }; });

  state.items.forEach(it => {
    if (!it.assignedTo.length) return;
    const share = it.price / it.assignedTo.length;
    it.assignedTo.forEach(p => {
      if (!perPerson[p]) return;
      perPerson[p].items.push({ name: it.name, amount: share, shared: it.assignedTo.length > 1 });
      perPerson[p].subtotal += share;
    });
  });

  state.people.forEach(p => {
    const d = perPerson[p];
    const tax = state.splitMode === 'equal'
      ? totalTax / (state.people.length || 1)
      : subtotal > 0 ? (totalTax * d.subtotal) / subtotal : 0;
    d.tax = tax;
    d.total = d.subtotal + tax;
  });

  return { subtotal, totalTax, perPerson };
}

function computeNetBalances() {
  const net = {};
  state.history.forEach(bill => {
    Object.entries(bill.debts).forEach(([debtor, d]) => {
      if (d.settled) return;
      net[debtor] = (net[debtor] || 0) - d.amount;
      net[bill.paidBy] = (net[bill.paidBy] || 0) + d.amount;
    });
  });
  return net;
}

// ---- Rendering ----
function renderPeople() {
  const row = document.getElementById('people-row');
  row.innerHTML = state.people.map(p => `
    <span class="chip">
      ${p}
      ${state.people.length > 1 ? `<span class="chip-remove" data-remove-person="${p}">×</span>` : ''}
    </span>
  `).join('') + `<button class="chip-add" id="add-person">+ Person</button>`;

  row.querySelectorAll('[data-remove-person]').forEach(el => {
    el.onclick = () => {
      const name = el.dataset.removePerson;
      state.people = state.people.filter(p => p !== name);
      state.items.forEach(it => { it.assignedTo = it.assignedTo.filter(p => p !== name); });
      newItemAssignees = newItemAssignees.filter(p => p !== name);
      if (state.paidBy === name) state.paidBy = state.people[0] || '';
      saveState();
      renderAll();
    };
  });
  document.getElementById('add-person').onclick = () => {
    let n = 2, name = 'Person 2';
    while (state.people.includes(name)) { n++; name = 'Person ' + n; }
    state.people.push(name);
    saveState();
    renderAll();
  };
}

function renderAssignRow() {
  document.getElementById('assign-row').innerHTML = state.people.map(p => `
    <button type="button" class="assign-chip ${newItemAssignees.includes(p) ? 'is-active' : ''}" data-assign="${p}">${p}</button>
  `).join('');
  document.querySelectorAll('[data-assign]').forEach(el => {
    el.onclick = () => {
      const p = el.dataset.assign;
      newItemAssignees = newItemAssignees.includes(p)
        ? newItemAssignees.filter(x => x !== p)
        : [...newItemAssignees, p];
      renderAssignRow();
    };
  });
}

function renderPaidBy() {
  document.getElementById('paid-by').innerHTML = state.people.map(p => `
    <button type="button" class="assign-chip ${state.paidBy === p ? 'is-active' : ''}" data-paidby="${p}">${p}</button>
  `).join('');
  document.querySelectorAll('[data-paidby]').forEach(el => {
    el.onclick = () => {
      state.paidBy = el.dataset.paidby;
      saveState();
      renderPaidBy();
      renderReceipts();
    };
  });
}

function renderItems() {
  const list = document.getElementById('items-list');
  if (!state.items.length) {
    list.innerHTML = `<p class="empty-note">No items yet. Add what each person ordered above.</p>`;
    return;
  }
  list.innerHTML = `<div class="card">` + state.items.map(it => `
    <div class="item-row">
      <div>
        <div class="item-name">${escapeHtml(it.name)}</div>
        <div class="item-assignees">${it.assignedTo.length ? it.assignedTo.join(', ') : 'unassigned'}</div>
      </div>
      <div class="item-row-right">
        <span class="item-price-tag mono">${fmt(it.price)}</span>
        <button class="item-remove" data-del="${it.id}">Remove</button>
      </div>
    </div>
  `).join('') + `</div>`;

  list.querySelectorAll('[data-del]').forEach(el => {
    el.onclick = () => {
      state.items = state.items.filter(it => it.id !== parseInt(el.dataset.del));
      saveState();
      renderAll();
    };
  });
}

function renderReceipts() {
  const { perPerson } = computeBill();
  const grid = document.getElementById('receipts');
  grid.innerHTML = state.people.map(p => {
    const d = perPerson[p];
    return `
      <div class="receipt-card">
        <p class="receipt-name">${escapeHtml(p)}</p>
        ${!d.items.length ? `<p class="empty-note" style="padding:0;">No items assigned.</p>` :
          d.items.map(it => `
            <div class="receipt-line">
              <span>${escapeHtml(it.name)}${it.shared ? ' (shared)' : ''}</span>
              <span class="mono">${fmt(it.amount)}</span>
            </div>
          `).join('')}
        <div class="receipt-line receipt-tax-line">
          <span>GST (${state.gstRate}%)</span>
          <span class="mono">${fmt(d.tax)}</span>
        </div>
        <div class="receipt-total-row">
          <span class="receipt-total-label">Total</span>
          <span class="mono receipt-total-label">${fmt(d.total)}</span>
        </div>
      </div>
    `;
  }).join('');
}

function renderLedger() {
  const net = computeNetBalances();
  const balEl = document.getElementById('net-balances');
  const entries = Object.entries(net).filter(([, v]) => Math.abs(v) > 0.5);
  balEl.innerHTML = entries.length ? entries.map(([name, v]) => `
    <div class="balance-line">
      <span>${escapeHtml(name)}</span>
      <span class="${v < 0 ? 'balance-owes' : 'balance-owed'}">${v < 0 ? 'owes ' + fmt(-v) : 'is owed ' + fmt(v)}</span>
    </div>
  `).join('') : `<p class="balance-settled">Everyone is settled up.</p>`;

  const historyEl = document.getElementById('bill-history');
  if (!state.history.length) {
    historyEl.innerHTML = `<p class="empty-note">Saved bills will show up here.</p>`;
    return;
  }
  historyEl.innerHTML = state.history.slice().reverse().map(bill => `
    <div class="card">
      <div class="bill-card-header">
        <span class="bill-card-title">${escapeHtml(bill.title)}</span>
        <span class="bill-card-paidby">paid by ${escapeHtml(bill.paidBy)}</span>
      </div>
      ${Object.entries(bill.debts).map(([debtor, d]) => `
        <div class="debt-row">
          <span class="debt-text ${d.settled ? 'is-settled' : ''}">${escapeHtml(debtor)} owes ${escapeHtml(bill.paidBy)} ${fmt(d.amount)}</span>
          <button class="settle-btn ${d.settled ? 'is-done' : ''}" data-bill="${bill.id}" data-debtor="${debtor}">
            ${d.settled ? 'Settled' : 'Mark paid'}
          </button>
        </div>
      `).join('')}
    </div>
  `).join('');

  historyEl.querySelectorAll('[data-bill]').forEach(btn => {
    btn.onclick = () => {
      const bill = state.history.find(b => b.id === parseInt(btn.dataset.bill));
      const d = bill.debts[btn.dataset.debtor];
      d.settled = !d.settled;
      saveState();
      renderLedger();
    };
  });
}

function renderAll() {
  renderPeople();
  renderAssignRow();
  renderPaidBy();
  renderItems();
  renderReceipts();
  renderLedger();
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ---- Event wiring ----
document.getElementById('add-item').onclick = () => {
  const nameEl = document.getElementById('item-name');
  const priceEl = document.getElementById('item-price');
  const name = nameEl.value.trim();
  const price = parseFloat(priceEl.value);
  if (!name || isNaN(price) || price <= 0) return;
  state.items.push({ id: nextItemId++, name, price, assignedTo: [...newItemAssignees] });
  nameEl.value = '';
  priceEl.value = '';
  newItemAssignees = [];
  saveState();
  renderAll();
};

document.getElementById('gst-rate').addEventListener('input', (e) => {
  state.gstRate = e.target.value;
  saveState();
  renderReceipts();
});

document.getElementById('bill-title').addEventListener('input', (e) => {
  state.billTitle = e.target.value;
  saveState();
});

document.getElementById('split-mode').querySelectorAll('.segmented-btn').forEach(btn => {
  btn.onclick = () => {
    state.splitMode = btn.dataset.value;
    document.querySelectorAll('#split-mode .segmented-btn').forEach(b => b.classList.remove('is-active'));
    btn.classList.add('is-active');
    saveState();
    renderReceipts();
  };
});

document.getElementById('save-bill').onclick = () => {
  if (!state.items.length) return;
  const { perPerson } = computeBill();
  const debts = {};
  state.people.forEach(p => {
    if (p === state.paidBy) return;
    if (perPerson[p].total > 0.5) debts[p] = { amount: perPerson[p].total, settled: false };
  });
  state.history.push({
    id: nextHistoryId++,
    title: state.billTitle.trim() || 'Untitled bill',
    paidBy: state.paidBy,
    debts,
  });
  state.items = [];
  state.billTitle = '';
  document.getElementById('bill-title').value = '';
  saveState();
  renderAll();
};

document.getElementById('reset-data').onclick = () => {
  if (!confirm('Clear all people, items, and bill history on this device?')) return;
  state = structuredClone(defaultState);
  newItemAssignees = [];
  saveState();
  renderAll();
};

document.querySelectorAll('.tab').forEach(tab => {
  tab.onclick = () => {
    document.querySelectorAll('.tab').forEach(t => { t.classList.remove('is-active'); t.setAttribute('aria-selected', 'false'); });
    tab.classList.add('is-active');
    tab.setAttribute('aria-selected', 'true');
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('is-active'));
    document.getElementById('panel-' + tab.dataset.tab).classList.add('is-active');
  };
});

// ---- Init ----
document.getElementById('bill-title').value = state.billTitle;
document.getElementById('gst-rate').value = state.gstRate;
document.querySelectorAll('#split-mode .segmented-btn').forEach(b => {
  b.classList.toggle('is-active', b.dataset.value === state.splitMode);
});
renderAll();
