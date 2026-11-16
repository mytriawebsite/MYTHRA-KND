import {
  auth,
  db,
  authReady,
  onAuthStateChanged,
  signOut,
  doc,
  getDoc
} from "./firebase.js";

import {
  reload
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import { MiningEngine } from "./mining-engine.js";
import {
  calculateGlobalHashPower,
  formatHashPower
} from "./global-mining-stats.js";
import { BlockTimer } from "./block-timer.js";

let activeMiningEngine = null;
let activeBlockTimer = null;
let miningTickListenerInstalled = false;

onAuthStateChanged(auth, async (user) => {
  const isLoginPage = window.location.pathname.endsWith("/login2.html") || window.location.pathname === "/login2.html";

  if (!user) {
    if (activeMiningEngine) {
      activeMiningEngine.stop();
      activeMiningEngine = null;
    }

    if (activeBlockTimer) {
      activeBlockTimer.stop();
      activeBlockTimer = null;
    }

    if (!isLoginPage) {
      window.location.replace("login2.html");
    }
    return;
  }

  try {
    await authReady;
    await reload(user);
    await user.getIdToken(true);

    const isEmailPasswordAccount = user.providerData.some(
      (provider) => provider.providerId === "password"
    );

    if (isEmailPasswordAccount && !user.emailVerified) {
      console.warn("Conta sem e-mail verificado. Acesso bloqueado.");
      await signOut(auth);
      return;
    }

    if (isLoginPage) {
      window.location.replace("index.html");
      return;
    }

    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
    const userData = userSnap.exists() ? userSnap.data() : {};

    const myPowerEl = document.getElementById("my-total-power");
    if (myPowerEl) {
      myPowerEl.innerText = `${userData.hashPower || 0} Gh/s`;
    }

    const globalGh = await calculateGlobalHashPower();
    const globalPowerEl = document.getElementById("total-pools-power");
    if (globalPowerEl) {
      globalPowerEl.innerText = formatHashPower(globalGh);
    }

    if (!activeMiningEngine) {
      activeMiningEngine = new MiningEngine(user.uid);
      activeMiningEngine.init();
    }

    if (!activeBlockTimer) {
      activeBlockTimer = new BlockTimer(300, "next-block-timer");
      activeBlockTimer.start();
    }

    if (!miningTickListenerInstalled) {
      window.addEventListener("mytria:mining-tick", (event) => {
        const { balances } = event.detail || {};
        const mainCoinEl =
          document.getElementById("header-main-coin-balance");

        if (mainCoinEl && balances && balances.MYT !== undefined) {
          mainCoinEl.innerText = balances.MYT.toFixed(8);
        }
      });

      miningTickListenerInstalled = true;
    }
  } catch (error) {
    console.error("Erro no fluxo de autenticação:", error);
  }
});
