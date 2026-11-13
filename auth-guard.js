import { auth, db, onAuthStateChanged, signOut, doc, getDoc } from "./firebase.js";
import { MiningEngine } from "./mining-engine.js";
import { calculateGlobalHashPower, formatHashPower } from "./global-mining-stats.js";
import { BlockTimer } from "./block-timer.js";

let activeMiningEngine = null;
let activeBlockTimer = null;

onAuthStateChanged(auth, async (user) => {
  const isLoginPage = window.location.pathname.includes("login.html");

  if (user) {
    if (isLoginPage) {
      window.location.href = "index.html";
      return;
    }

    try {
      // 1. Pega os dados do usuário logado
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.exists() ? userSnap.data() : {};

      // Atualiza o Hash Power Pessoal
      const myPowerEl = document.getElementById("my-total-power");
      if (myPowerEl) {
        myPowerEl.innerText = `${userData.hashPower || 0} Gh/s`;
      }

      // 2. Calcula e atualiza o Hash Power Global
      const globalGh = await calculateGlobalHashPower();
      const globalPowerEl = document.getElementById("total-pools-power");
      if (globalPowerEl) {
        globalPowerEl.innerText = formatHashPower(globalGh);
      }

      // 3. Inicializa o motor de mineração em background
      if (!activeMiningEngine) {
        activeMiningEngine = new MiningEngine(user.uid);
        activeMiningEngine.init();
      }

      // 4. Inicializa o cronômetro do próximo bloco
      if (!activeBlockTimer) {
        activeBlockTimer = new BlockTimer(300, "next-block-timer");
        activeBlockTimer.start();
      }

      // Ouve os ticks de mineração para atualizar o saldo no header em tempo real
      window.addEventListener('mytria:mining-tick', (e) => {
        const { balances } = e.detail;
        const mainCoinEl = document.getElementById("header-main-coin-balance");
        if (mainCoinEl && balances.MYT !== undefined) {
          mainCoinEl.innerText = balances.MYT.toFixed(8);
        }
      });

    } catch (err) {
      console.error("Erro no fluxo de autenticação e estatísticas:", err);
    }

  } else {
    if (activeMiningEngine) activeMiningEngine.stop();
    if (activeBlockTimer) activeBlockTimer.stop();
    if (!isLoginPage) {
      window.location.href = "login.html";
    }
  }
});
