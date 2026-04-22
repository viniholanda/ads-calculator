// ================================================================
// LocalStorage Wrapper — Mercado Ads Pro
// ================================================================

const CLIENTS_KEY = 'ml_ads_clients_v1';
const ACTIVE_CLIENT_KEY = 'ml_ads_active_client';

export function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ── Clients ──
export function loadClients() {
  try { return JSON.parse(localStorage.getItem(CLIENTS_KEY)) || []; }
  catch { return []; }
}

export function saveClients(list) {
  localStorage.setItem(CLIENTS_KEY, JSON.stringify(list));
}

export function getActiveClientId() {
  return localStorage.getItem(ACTIVE_CLIENT_KEY);
}

export function setActiveClientId(id) {
  localStorage.setItem(ACTIVE_CLIENT_KEY, id);
}

export function initClients() {
  let clients = loadClients();
  if (clients.length === 0) {
    const id = genId();
    clients = [{ id, name: 'Minha Conta', createdAt: new Date().toISOString() }];
    saveClients(clients);
    setActiveClientId(id);
  } else {
    const activeId = getActiveClientId();
    if (!activeId || !clients.find(c => c.id === activeId)) {
      setActiveClientId(clients[0].id);
    }
  }
  return { clients, activeId: getActiveClientId() };
}

// ── Scenarios ──
export function scenariosKey(clientId) {
  return `ml_ads_scenarios_${clientId || getActiveClientId()}`;
}

export function loadScenarios(clientId) {
  try { return JSON.parse(localStorage.getItem(scenariosKey(clientId))) || []; }
  catch { return []; }
}

export function saveScenarios(list, clientId) {
  localStorage.setItem(scenariosKey(clientId), JSON.stringify(list));
}

// ── Benchmarks ──
export function benchKey(clientId) {
  return `ml_ads_benchmarks_${clientId || getActiveClientId()}`;
}

export function loadThresholds(clientId, defaultFn) {
  try {
    const saved = JSON.parse(localStorage.getItem(benchKey(clientId)));
    if (saved && typeof saved === 'object') return saved;
  } catch {}
  return defaultFn();
}

export function saveThresholds(thresholds, clientId) {
  localStorage.setItem(benchKey(clientId), JSON.stringify(thresholds));
}

// ── Theme ──
export function loadTheme() {
  return localStorage.getItem('ml_ads_theme') || 'dark';
}

export function saveTheme(theme) {
  localStorage.setItem('ml_ads_theme', theme);
}
