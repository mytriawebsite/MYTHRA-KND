import { GameState } from './modules/state.js';
import { formatHashPower } from './modules/power-format.js';

window.toggleSidebar = function() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (sidebar) sidebar.classList.toggle('active');
  if (overlay) overlay.classList.toggle('active');
};

window.toggleCoinDropdown = function(e) {
  if (e) e.stopPropagation();
  const dropdownMenu = document.getElementById('dropdown-menu');
  if (dropdownMenu) dropdownMenu.classList.toggle('open');
};

window.openTasksModal = function(tab = 'daily') {
  const modal = document.getElementById('tasks-modal');
  if (modal) {
    modal.style.display = 'flex';
    window.switchTaskTab(tab);
  }
};

window.closeTasksModal = function() {
  const modal = document.getElementById('tasks-modal');
  if (modal) modal.style.display = 'none';
};

// Lista Oficial Completa de Tarefas Diárias e Semanais
const dailyTasksData = [
  { title: "Login diário", reward: "Consiga 3 MTG", progress: "1/1", pct: 100, status: "Claim" },
  { title: "Abra 1 Baú LMT Qualquer", reward: "Consiga 20 MTG", progress: "0/1", pct: 0, status: "To do" },
  { title: "Compre 2 MYT", reward: "Obtenha 0,1 MYT", progress: "0/2", pct: 0, status: "To do" },
  { title: "Compre 5 MYT", reward: "Obtenha 0,2 MYT", progress: "0/5", pct: 0, status: "To do" },
  { title: "Ganhe 0,3 LMT no Offerwall", reward: "Consiga 25 MTG", progress: "0/0.3", pct: 0, status: "To do" },
  { title: "Complete 5 tarefas diárias", reward: "Consiga 30 MTG", progress: "0/5", pct: 0, status: "To do" },
  { title: "Ganhe 10 jogos de Aero Dash", reward: "Consiga 10 MTG", progress: "0/10", pct: 0, status: "To do" },
  { title: "Ganhe 30 jogos", reward: "Consiga 20 MTG", progress: "30/30", pct: 100, status: "Claim" },
  { title: "Ganhe 50 jogos", reward: "Consiga 30 MTG", progress: "50/50", pct: 100, status: "Claim" }
];

const weeklyTasksData = [
  { title: "Ganhe 100 jogos", reward: "Consiga 20 MTG", progress: "0/100", pct: 0, status: "To do" },
  { title: "Conclua 25 tarefas diárias", reward: "Consiga 10 MTG", progress: "0/25", pct: 0, status: "To do" },
  { title: "Ganhe 220 jogos", reward: "Consiga MTG", progress: "0/220", pct: 0, status: "To do" },
  { title: "Abra 1 baú qualquer", reward: "Consiga 10 MTG", progress: "0/1", pct: 0, status: "To do" },
  { title: "Compre 10 MYT", reward: "Obtenha 0,5 MYT", progress: "0/10", pct: 0, status: "To do" },
  { title: "Compre 50 MYT", reward: "Obtenha 2,5 MYT", progress: "0/50", pct: 0, status: "To do" },
  { title: "Gaste 5 MYT no mercado", reward: "Consiga 50 MTG", progress: "0/5", pct: 0, status: "To do" },
  { title: "Gaste 30 MYT no mercado", reward: "Consiga 300 MTG", progress: "0/30", pct: 0, status: "To do" },
  { title: "Ganhe 5 MYT no Offerwall", reward: "Obtenha 1 MYT", progress: "0/5", pct: 0, status: "To do" },
  { title: "Conclua 25 tarefas diárias", reward: "Consiga 15 MTG", progress: "0/25", pct: 0, status: "To do" },
  { title: "Conclua 40 tarefas diárias", reward: "Consiga 20 MTG", progress: "0/40", pct: 0, status: "To do" },
  { title: "Conclua 5 tarefas semanais", reward: "Consiga 15 MTG", progress: "0/5", pct: 0, status: "To do" },
  { title: "Conclua 8 tarefas semanais", reward: "Obtenha 1 MTG", progress: "0/8", pct: 0, status: "To do" }
];

window.switchTaskTab = function(tabType) {
    window.currentTaskTab = tabType;
  const dailyBtn = document.getElementById('modal-tab-daily');
  const weeklyBtn = document.getElementById('modal-tab-weekly');
  const contentList = document.getElementById('tasks-content-list');
  if (!contentList) return;

  const tasks = getTaskData(tabType);

  if (tabType === 'daily') {
    if (dailyBtn) { dailyBtn.style.background = 'var(--accent-cyan)'; dailyBtn.style.color = '#000'; }
    if (weeklyBtn) { weeklyBtn.style.background = 'transparent'; weeklyBtn.style.color = '#fff'; }
  } else {
    if (weeklyBtn) { weeklyBtn.style.background = 'var(--accent-cyan)'; weeklyBtn.style.color = '#000'; }
    if (dailyBtn) { dailyBtn.style.background = 'transparent'; dailyBtn.style.color = '#fff'; }
  }

  contentList.innerHTML = tasks.map(renderTaskCard).join('');
};

window.switchHomeTab = function(tabType) {
  const tabDaily = document.getElementById('home-tab-daily');
  const tabWeekly = document.getElementById('home-tab-weekly');
  if (tabType === 'daily') {
    if (tabDaily) { tabDaily.style.color = 'var(--accent-lime)'; tabDaily.style.borderBottom = '2px solid var(--accent-lime)'; }
    if (tabWeekly) { tabWeekly.style.color = 'var(--text-muted)'; tabWeekly.style.borderBottom = 'none'; }
  } else {
    if (tabWeekly) { tabWeekly.style.color = 'var(--accent-lime)'; tabWeekly.style.borderBottom = '2px solid var(--accent-lime)'; }
    if (tabDaily) { tabDaily.style.color = 'var(--text-muted)'; tabDaily.style.borderBottom = 'none'; }
  }
  renderHomeQuestsPreview(tabType);
};


function getTaskData(tabType = 'daily') {
  const state = GameState.get();
  const source = tabType === 'daily' ? dailyTasksData : weeklyTasksData;
  const saved = tabType === 'daily' ? state.quests.daily : state.quests.weekly;

  const mapping = {
    'Login diário': 'login',
    'Ganhe 10 jogos de Aero Dash': 'games_aero_10',
    'Ganhe 30 jogos': 'games_30',
    'Ganhe 50 jogos': 'games_50',
    'Ganhe 100 jogos': 'games_100',
    'Ganhe 220 jogos': 'games_220'
  };

  return source.map(task => {
    const key = mapping[task.title];
    if (!key) {
      return {
        ...task,
        progress: 'Não integrado',
        pct: 0,
        status: 'Indisponível'
      };
    }

    const q = saved && saved[key];
    if (!q) {
      return { ...task, progress: '0/0', pct: 0, status: 'To do' };
    }

    const current = Math.max(0, Number(q.current) || 0);
    const max = Math.max(1, Number(q.max) || 1);
    const pct = Math.min(100, Math.round(current / max * 100));

    return {
      ...task,
      progress: `${current}/${max}`,
      pct,
      status: current >= max ? 'Completed' : 'To do'
    };
  });
}

function renderHomeQuestsPreview(tabType = 'daily') {
  const container = document.getElementById('home-quests-preview');
  if (!container) return;
  const tasks = getTaskData(tabType);
  container.innerHTML = tasks.slice(0, 3).map(renderTaskCard).join('');
}

function renderTaskCard(t) {
  const isDone = t.status === 'Completed' || t.status === 'Claim';
  const bgCard = isDone ? '#13151c' : '#151821';
  const textColor = isDone ? '#888' : '#fff';
  const subColor = isDone ? '#666' : 'var(--text-muted)';
  const fillColor = isDone ? '#555' : 'var(--accent-cyan)';
  
  const btnStyle = isDone
    ? 'background: var(--accent-lime); color: #000; border: none; padding: 4px 12px; font-size: 11px; font-weight: bold; border-radius: 4px; cursor: pointer;'
    : 'background: #2a2e39; color: #888; border: none; padding: 4px 12px; font-size: 11px; border-radius: 4px; cursor: default;';

  return `
    <div style="background: ${bgCard}; border: 1px solid var(--border-color); border-radius: 8px; padding: 12px; display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
      <div style="display: flex; align-items: center; gap: 10px;">
        <div style="background: #2a2215; border: 1px solid #f3cc30; border-radius: 4px; padding: 6px; text-align: center; min-width: 36px;">
          <span style="font-size: 10px; font-weight: bold; color: #f3cc30;">MTG</span>
        </div>
        <div>
          <div style="color: ${textColor}; font-size: 12px; font-weight: bold;">${t.title}</div>
          <div style="color: ${subColor}; font-size: 11px;">${t.reward}</div>
          <div style="background: #222; height: 4px; border-radius: 2px; margin-top: 4px; width: 120px;">
            <div style="width: ${t.pct}%; height: 100%; background: ${fillColor}; border-radius: 2px;"></div>
          </div>
        </div>
      </div>
      <div style="text-align: right;">
        <span style="font-size: 11px; color: ${subColor}; display: block; margin-bottom: 4px;">${t.progress}</span>
        <button style="${btnStyle}">${t.status}</button>
      </div>
    </div>
  `;
}

window.openTelemetryModal = function() {
  const modal = document.getElementById('telemetry-modal');
  if (modal) {
    modal.style.display = 'flex';
    renderTelemetryTable();
  }
};

window.closeTelemetryModal = function() {
  const modal = document.getElementById('telemetry-modal');
  if (modal) modal.style.display = 'none';
};


const GAME_NAMES = {
  aero_dash: 'Aero Dash',
  coin_catcher: 'Coin Catcher',
  crypto_2048: 'Crypto 2048',
  match_3: 'Match-3',
  token_blaster: 'Token Blaster'
};


function renderTelemetryTable() {
  const container = document.getElementById('telemetry-table-body');
  if (!container) return;

  const state = GameState.get();
  const totals = {};

  Object.keys(GAME_NAMES).forEach(key => totals[key] = 0);

  (state.gamePowerRewards || []).forEach(reward => {
    if (reward.gameKey && Object.prototype.hasOwnProperty.call(totals, reward.gameKey)) {
      totals[reward.gameKey] += Number(reward.amount) || 0;
    }
  });

  container.innerHTML = Object.keys(GAME_NAMES).map(key => `
    <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
      <td style="padding: 10px 6px; font-weight: bold; color: #fff;">${GAME_NAMES[key]}</td>
      <td style="padding: 10px 6px; font-weight: bold; color: var(--accent-cyan);">GAME</td>
      <td style="padding: 10px 6px; color: #fff;">${formatHashPower(totals[key])}</td>
    </tr>
  `).join('');
}

document.addEventListener('DOMContentLoaded', () => {
  renderGlobalState();
  buildCoinDropdownList();
  renderHomeQuestsPreview('daily');

  window.addEventListener('mytria_state_changed', () => {
    renderGlobalState();
    buildCoinDropdownList();
  });

  document.addEventListener('click', (e) => {
    const walletSelected = document.getElementById('wallet-selected');
    const dropdownMenu = document.getElementById('dropdown-menu');
    if (walletSelected && dropdownMenu && !walletSelected.contains(e.target) && !dropdownMenu.contains(e.target)) {
      dropdownMenu.classList.remove('open');
    }
  });
});

function renderGlobalState() {
  const state = GameState.get();
  
  const usernameEls = document.querySelectorAll('#username');
  usernameEls.forEach(el => {
    if (el) el.innerText = state.username || "Astronaut_93042";
  });

  // Atualiza os poderes na Home e no Game Hub dinamicamente
  const powerVal = formatHashPower(state.totalPower);
  
  const homeTotalPower = document.getElementById('home-total-power');
  if (homeTotalPower) homeTotalPower.innerText = powerVal;

  const homeGlobalPower = document.getElementById('home-global-power');
  if (homeGlobalPower) homeGlobalPower.innerText = 'Aguardando Firebase';

  const hubTotalPower = document.getElementById('hub-total-power');
  if (hubTotalPower) hubTotalPower.innerText = powerVal;

  const walletSelected = document.getElementById('wallet-selected');
  if (walletSelected && state.selectedCoin) {
    walletSelected.innerHTML = `
      <div style="display:flex; align-items:center; gap:6px;">
        <span style="width: 10px; height: 10px; background: ${state.selectedCoin.color || '#00ff66'}; border-radius: 50%; display: inline-block;"></span>
        <span style="font-weight:600; color: ${state.selectedCoin.color || '#fff'};">${state.selectedCoin.name}</span>
      </div>
      <span style="font-weight:600; color: #fff;">${Number(state.selectedCoin.balance || 0).toFixed(8)}</span>
      <span style="font-size: 10px; color: var(--text-muted);">▼</span>
    `;
  }
}

function buildCoinDropdownList() {
  const dropdownMenu = document.getElementById('dropdown-menu');
  if (!dropdownMenu) return;

  const state = GameState.get();
  let coins = state.coins || [];

  dropdownMenu.innerHTML = `
    <div style="padding: 10px 14px; background: rgba(0,240,255,0.1); border-bottom: 1px solid var(--border-color); font-size: 11px; font-weight: bold; color: var(--accent-cyan);">
      SELECIONAR CRIPTOMOEDA
    </div>
  ` + coins.map(c => `
    <div class="dropdown-item" data-coin-name="${c.name}" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; cursor: pointer; border-bottom: 1px solid rgba(255,255,255,0.05);">
      <span style="display:flex; align-items:center; gap:10px;">
        <span style="width: 8px; height: 8px; background: ${c.color || '#fff'}; border-radius: 50%;"></span>
        <span style="font-weight: 500; color: #fff;">${c.name}</span>
      </span>
      <strong style="color: ${c.color || 'var(--accent-lime)'};">${Number(c.balance || 0).toFixed(8)}</strong>
    </div>
  `).join('');

  dropdownMenu.querySelectorAll('.dropdown-item').forEach(item => {
    item.onclick = function(e) {
      e.stopPropagation();
      const coinName = this.getAttribute('data-coin-name');
      const chosen = coins.find(c => c.name === coinName);
      if (chosen) {
        GameState.updateProfile({ selectedCoin: chosen });
      }
      dropdownMenu.classList.remove('open');
    };
  });
}


window.resetTestData = function() {
  const confirmed = window.confirm(
    'ATENÇÃO: isso apagará o progresso local do MYTRIA neste navegador. Deseja continuar?'
  );
  if (confirmed) GameState.resetTestData();
};
