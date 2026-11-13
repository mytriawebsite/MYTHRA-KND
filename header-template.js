import { auth, db, onAuthStateChanged, signOut, doc, getDoc, onSnapshot } from "./firebase.js";

function initHeader() {
  let container = document.getElementById("header-container");
  
  if (!container) {
    container = document.createElement("div");
    container.id = "header-container";
    document.body.insertBefore(container, document.body.firstChild);
  }

  container.innerHTML = `
    <header style="background: #060b18; border-bottom: 1px solid #1e293b; padding: 8px 10px; position: sticky; top: 0; z-index: 1000; width: 100%; box-sizing: border-box;">
      <!-- LINHA 1: Atalhos Principais e Menu Hambúrguer -->
      <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
        <div class="top-icon-nav" style="display: flex; gap: 6px; overflow-x: auto; padding-bottom: 2px; scrollbar-width: none; flex: 1;">
          <a href="index.html" class="icon-nav-btn" title="HomePage" style="background: #0f172a; border: 1px solid #1e293b; color: #94a3b8; padding: 6px 12px; border-radius: 8px; font-size: 0.9rem; display: flex; align-items: center; justify-content: center; text-decoration: none; white-space: nowrap;"><i class="fa-solid fa-house"></i></a>
          <a href="profile.html" class="icon-nav-btn" title="Profile" style="background: #0f172a; border: 1px solid #1e293b; color: #94a3b8; padding: 6px 12px; border-radius: 8px; font-size: 0.9rem; display: flex; align-items: center; justify-content: center; text-decoration: none; white-space: nowrap;"><i class="fa-solid fa-user"></i></a>
          <a href="wallet.html" class="icon-nav-btn" title="Wallet" style="background: #0f172a; border: 1px solid #1e293b; color: #94a3b8; padding: 6px 12px; border-radius: 8px; font-size: 0.9rem; display: flex; align-items: center; justify-content: center; text-decoration: none; white-space: nowrap;"><i class="fa-solid fa-wallet"></i></a>
          <a href="games.html" class="icon-nav-btn" title="Games" style="background: #0f172a; border: 1px solid #1e293b; color: #94a3b8; padding: 6px 12px; border-radius: 8px; font-size: 0.9rem; display: flex; align-items: center; justify-content: center; text-decoration: none; white-space: nowrap;"><i class="fa-solid fa-gamepad"></i></a>
          <a href="market.html" class="icon-nav-btn" title="Oficial Store" style="background: #0f172a; border: 1px solid #1e293b; color: #94a3b8; padding: 6px 12px; border-radius: 8px; font-size: 0.9rem; display: flex; align-items: center; justify-content: center; text-decoration: none; white-space: nowrap;"><i class="fa-solid fa-store"></i></a>
          <a href="marketplace.html" class="icon-nav-btn" title="Market Place" style="background: #0f172a; border: 1px solid #1e293b; color: #94a3b8; padding: 6px 12px; border-radius: 8px; font-size: 0.9rem; display: flex; align-items: center; justify-content: center; text-decoration: none; white-space: nowrap;"><i class="fa-solid fa-shop"></i></a>
          <a href="inventory.html" class="icon-nav-btn" title="Inventory" style="background: #0f172a; border: 1px solid #1e293b; color: #94a3b8; padding: 6px 12px; border-radius: 8px; font-size: 0.9rem; display: flex; align-items: center; justify-content: center; text-decoration: none; white-space: nowrap;"><i class="fa-solid fa-box-open"></i></a>
          <a href="p2p-market.html" class="icon-nav-btn" title="Market Place P2P" style="background: #0f172a; border: 1px solid #1e293b; color: #94a3b8; padding: 6px 12px; border-radius: 8px; font-size: 0.9rem; display: flex; align-items: center; justify-content: center; text-decoration: none; white-space: nowrap;"><i class="fa-solid fa-handshake"></i></a>
          <a href="merge.html" class="icon-nav-btn" title="Merge" style="background: #0f172a; border: 1px solid #1e293b; color: #94a3b8; padding: 6px 12px; border-radius: 8px; font-size: 0.9rem; display: flex; align-items: center; justify-content: center; text-decoration: none; white-space: nowrap;"><i class="fa-solid fa-screwdriver-wrench"></i></a>
          <a href="rankings.html" class="icon-nav-btn" title="Rankings" style="background: #0f172a; border: 1px solid #1e293b; color: #94a3b8; padding: 6px 12px; border-radius: 8px; font-size: 0.9rem; display: flex; align-items: center; justify-content: center; text-decoration: none; white-space: nowrap;"><i class="fa-solid fa-trophy"></i></a>
          <a href="referral.html" class="icon-nav-btn" title="Referral Program" style="background: #0f172a; border: 1px solid #1e293b; color: #94a3b8; padding: 6px 12px; border-radius: 8px; font-size: 0.9rem; display: flex; align-items: center; justify-content: center; text-decoration: none; white-space: nowrap;"><i class="fa-solid fa-users"></i></a>
          <a href="offerwalls.html" class="icon-nav-btn" title="Offerwall" style="background: #0f172a; border: 1px solid #1e293b; color: #94a3b8; padding: 6px 12px; border-radius: 8px; font-size: 0.9rem; display: flex; align-items: center; justify-content: center; text-decoration: none; white-space: nowrap;"><i class="fa-solid fa-fire"></i></a>
        </div>
        <div style="display: flex; align-items: center; padding-left: 6px;">
          <button id="sidebar-toggle" style="background: none; border: none; color: #fff; font-size: 1.2rem; cursor: pointer; padding: 4px;">
            <i class="fa-solid fa-bars"></i>
          </button>
        </div>
      </div>

      <!-- LINHA 2: Perfil Compacto (Esquerda) e Seletor de Moedas Adaptativo (Direita) -->
      <div class="top-nav-row2" style="display: flex; align-items: center; justify-content: space-between; gap: 8px; position: relative; margin-top: 8px; flex-wrap: wrap;">
        
        <!-- Perfil do Jogador Compacto (Esquerda) -->
        <div class="user-profile-badge" id="user-profile-btn" style="display: flex; align-items: center; gap: 6px; background: #060b18; padding: 4px 10px; border-radius: 8px; border: 1px solid #1e293b; cursor: pointer; max-width: 45%;">
          <div class="user-avatar-icon" id="header-avatar" style="width: 24px; height: 24px; border-radius: 50%; background: #00f2ff; color: #000; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.75rem; overflow: hidden; flex-shrink: 0;">M</div>
          <span class="user-name-tag" id="header-username" style="font-size: 0.75rem; font-weight: 600; color: #f8fafc; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Carregando...</span>
        </div>

        <!-- Seletor de Moedas Dinâmico (Direita) -->
        <div style="position: relative; flex: 1; min-width: 170px; max-width: 55%;">
          <div class="coin-selector-box" id="coin-dropdown-toggle" style="background: #060b18; border: 1px solid #00f2ff; border-radius: 8px; padding: 6px 10px; display: flex; align-items: center; justify-content: space-between; gap: 6px; cursor: pointer; width: 100%; box-sizing: border-box;">
            <div class="coin-selector-left" style="display: flex; align-items: center; gap: 6px; overflow: hidden; flex: 1;">
              <div class="crypto-custom-icon" id="active-coin-icon" style="color: #00f2ff; width: 16px; height: 16px; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; flex-shrink: 0;">
                <i class="fa-solid fa-rocket"></i>
              </div>
              <span id="active-coin-name" style="font-weight: bold; font-size: 0.85rem; color: #00f2ff; flex-shrink: 0;">MYT</span>
              <span id="active-coin-balance" style="font-size: 0.82rem; color: #f8fafc; overflow-x: auto; white-space: nowrap; scrollbar-width: none; flex: 1; text-align: right; padding-right: 2px;">0.000000</span>
            </div>
            <i class="fa-solid fa-chevron-down" style="font-size: 0.75rem; color: #94a3b8; flex-shrink: 0;"></i>
          </div>

          <!-- Dropdown de Moedas -->
          <div id="coin-dropdown-list" style="display: none; position: absolute; top: 100%; right: 0; width: 100%; background: #080e1d; border: 1px solid #00f2ff; border-radius: 10px; margin-top: 4px; z-index: 1100; box-shadow: 0 4px 15px rgba(0,0,0,0.8);">
            <div class="coin-option" data-coin="MYT" data-color="#00f2ff" style="padding: 8px 12px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #1e293b; cursor: pointer; font-size: 0.85rem;">
              <div style="display: flex; align-items: center; gap: 6px;">
                <div style="width: 18px; height: 18px; border: 2px solid #00f2ff; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #00f2ff; font-size: 0.6rem;"><i class="fa-solid fa-rocket"></i></div>
                <span style="font-weight: bold; color: #00f2ff;">MYT</span>
              </div>
              <span style="color: #fff;">0.000000</span>
            </div>
            <div class="coin-option" data-coin="MTG" data-color="#f59e0b" style="padding: 8px 12px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #1e293b; cursor: pointer; font-size: 0.85rem;">
              <div style="display: flex; align-items: center; gap: 6px;">
                <div style="width: 18px; height: 18px; border: 2px solid #f59e0b; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #f59e0b; font-size: 0.6rem;"><i class="fa-solid fa-rocket"></i></div>
                <span style="font-weight: bold; color: #f59e0b;">MTG</span>
              </div>
              <span style="color: #fff;">0.000000</span>
            </div>
            <div class="coin-option" data-coin="BTC" data-color="#f7931a" style="padding: 8px 12px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #1e293b; cursor: pointer; font-size: 0.85rem;">
              <div style="display: flex; align-items: center; gap: 6px;">
                <div style="width: 18px; height: 18px; background: #f7931a; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 0.6rem;"><i class="fa-brands fa-bitcoin"></i></div>
                <span style="font-weight: bold; color: #f7931a;">BTC</span>
              </div>
              <span style="color: #94a3b8;">0.00000000</span>
            </div>
            <div class="coin-option" data-coin="DOGE" data-color="#c2a633" style="padding: 8px 12px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #1e293b; cursor: pointer; font-size: 0.85rem;">
              <div style="display: flex; align-items: center; gap: 6px;">
                <div style="width: 18px; height: 18px; background: #c2a633; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 0.6rem;"><i class="fa-solid fa-dog"></i></div>
                <span style="font-weight: bold; color: #c2a633;">DOGE</span>
              </div>
              <span style="color: #94a3b8;">0.00000000</span>
            </div>
            <div class="coin-option" data-coin="LTC" data-color="#345d9d" style="padding: 8px 12px; display: flex; align-items: center; justify-content: space-between; cursor: pointer; font-size: 0.85rem;">
              <div style="display: flex; align-items: center; gap: 6px;">
                <div style="width: 18px; height: 18px; background: #345d9d; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 0.6rem;"><i class="fa-solid fa-litecoin-sign"></i></div>
                <span style="font-weight: bold; color: #345d9d;">LTC</span>
              </div>
              <span style="color: #94a3b8;">0.00000000</span>
            </div>
          </div>
        </div>

      </div>
    </header>

    <!-- Menu Lateral Hambúrguer -->
    <div class="sidebar" id="app-sidebar" style="position: fixed; top: 0; left: -280px; width: 280px; height: 100%; background-color: #080e1d; border-right: 1px solid #1e293b; transition: left 0.3s ease; z-index: 2000; display: flex; flex-direction: column; overflow-y: auto;">
      <div class="sidebar-header" style="padding: 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1e293b;">
        <div class="logo-container" style="color: #00f2ff; font-weight: bold; display: flex; align-items: center; gap: 8px;"><i class="fa-solid fa-cube"></i> MYTRIA MENU</div>
        <button id="sidebar-close" style="background:none; border:none; color:#fff; font-size:1.2rem; cursor:pointer;"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <ul class="sidebar-menu" style="list-style: none; padding: 15px; display: flex; flex-direction: column; gap: 8px; margin: 0;">
        <li><a href="index.html" style="display: flex; align-items: center; gap: 15px; padding: 12px 15px; color: #f8fafc; text-decoration: none; border-radius: 8px;"><i class="fa-solid fa-house" style="color: #00f2ff;"></i> HomePage</a></li>
        <li><a href="profile.html" style="display: flex; align-items: center; gap: 15px; padding: 12px 15px; color: #f8fafc; text-decoration: none; border-radius: 8px;"><i class="fa-solid fa-user" style="color: #00f2ff;"></i> Profile</a></li>
        <li><a href="wallet.html" style="display: flex; align-items: center; gap: 15px; padding: 12px 15px; color: #f8fafc; text-decoration: none; border-radius: 8px;"><i class="fa-solid fa-wallet" style="color: #84cc16;"></i> Wallet</a></li>
        <li><a href="games.html" style="display: flex; align-items: center; gap: 15px; padding: 12px 15px; color: #f8fafc; text-decoration: none; border-radius: 8px;"><i class="fa-solid fa-gamepad" style="color: #ec4899;"></i> Games</a></li>
        <li><a href="market.html" style="display: flex; align-items: center; gap: 15px; padding: 12px 15px; color: #f8fafc; text-decoration: none; border-radius: 8px;"><i class="fa-solid fa-store" style="color: #f59e0b;"></i> Oficial Store</a></li>
        <li><a href="marketplace.html" style="display: flex; align-items: center; gap: 15px; padding: 12px 15px; color: #f8fafc; text-decoration: none; border-radius: 8px;"><i class="fa-solid fa-shop" style="color: #00f2ff;"></i> Market Place</a></li>
        <li><a href="inventory.html" style="display: flex; align-items: center; gap: 15px; padding: 12px 15px; color: #f8fafc; text-decoration: none; border-radius: 8px;"><i class="fa-solid fa-box-open" style="color: #38bdf8;"></i> Inventory</a></li>
        <li><a href="p2p-market.html" style="display: flex; align-items: center; gap: 15px; padding: 12px 15px; color: #f8fafc; text-decoration: none; border-radius: 8px;"><i class="fa-solid fa-handshake" style="color: #00f2ff;"></i> Market Place P2P</a></li>
        <li><a href="merge.html" style="display: flex; align-items: center; gap: 15px; padding: 12px 15px; color: #f8fafc; text-decoration: none; border-radius: 8px;"><i class="fa-solid fa-screwdriver-wrench" style="color: #a855f7;"></i> Merge</a></li>
        <li><a href="rankings.html" style="display: flex; align-items: center; gap: 15px; padding: 12px 15px; color: #f8fafc; text-decoration: none; border-radius: 8px;"><i class="fa-solid fa-trophy" style="color: #eab308;"></i> Rankings</a></li>
        <li><a href="referral.html" style="display: flex; align-items: center; gap: 15px; padding: 12px 15px; color: #f8fafc; text-decoration: none; border-radius: 8px;"><i class="fa-solid fa-users" style="color: #3b82f6;"></i> Referral Program</a></li>
        <li><a href="offerwalls.html" style="display: flex; align-items: center; gap: 15px; padding: 12px 15px; color: #f8fafc; text-decoration: none; border-radius: 8px;"><i class="fa-solid fa-fire" style="color: #f97316;"></i> Offerwall</a></li>
        <li><a href="architecture.html" style="display: flex; align-items: center; gap: 15px; padding: 12px 15px; color: #00f2ff; text-decoration: none; border-radius: 8px;"><i class="fa-solid fa-diagram-project" style="color: #00f2ff;"></i> Project Architecture</a></li>
        <li><a href="about.html" style="display: flex; align-items: center; gap: 15px; padding: 12px 15px; color: #00f2ff; text-decoration: none; border-radius: 8px;"><i class="fa-solid fa-circle-info" style="color: #00f2ff;"></i> About</a></li>
        <li><a href="faq.html" style="display: flex; align-items: center; gap: 15px; padding: 12px 15px; color: #00f2ff; text-decoration: none; border-radius: 8px;"><i class="fa-solid fa-circle-question" style="color: #00f2ff;"></i> FAQ</a></li>
        <li id="adm-room-item" style="display: none;"><a href="offers.html" style="display: flex; align-items: center; gap: 15px; padding: 12px 15px; color: #ef4444; text-decoration: none; border-radius: 8px;"><i class="fa-solid fa-shield-halved" style="color: #ef4444;"></i> ADM ROOM</a></li>
        <hr style="border: 0; border-top: 1px solid #1e293b; margin: 6px 0;">
        <li><a href="#" id="btn-logout" style="display: flex; align-items: center; gap: 15px; padding: 12px 15px; color: #ef4444; text-decoration: none; border-radius: 8px;"><i class="fa-solid fa-right-from-bracket"></i> Log out</a></li>
      </ul>
    </div>
    <div class="overlay" id="sidebar-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); display: none; z-index: 1500;"></div>
  `;

  // Eventos de clique do dropdown e menu
  const dropdownToggle = document.getElementById("coin-dropdown-toggle");
  const dropdownList = document.getElementById("coin-dropdown-list");
  if (dropdownToggle && dropdownList) {
    dropdownToggle.onclick = (e) => {
      e.stopPropagation();
      dropdownList.style.display = dropdownList.style.display === "block" ? "none" : "block";
    };
    document.addEventListener("click", () => {
      dropdownList.style.display = "none";
    });
    document.querySelectorAll(".coin-option").forEach(opt => {
      opt.onclick = () => {
        const coinName = opt.getAttribute("data-coin");
        const coinColor = opt.getAttribute("data-color");
        document.getElementById("active-coin-name").innerText = coinName;
        document.getElementById("active-coin-name").style.color = coinColor;
        const activeIconContainer = document.getElementById("active-coin-icon");
        activeIconContainer.style.color = coinColor;
        if (coinName === "MYT" || coinName === "MTG") {
          activeIconContainer.innerHTML = `<div style="width: 16px; height: 16px; border: 2px solid ${coinColor}; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.55rem;"><i class="fa-solid fa-rocket"></i></div>`;
        } else if (coinName === "BTC") {
          activeIconContainer.innerHTML = `<i class="fa-brands fa-bitcoin" style="color: ${coinColor};"></i>`;
        } else if (coinName === "DOGE") {
          activeIconContainer.innerHTML = `<i class="fa-solid fa-dog" style="color: ${coinColor};"></i>`;
        } else if (coinName === "LTC") {
          activeIconContainer.innerHTML = `<i class="fa-solid fa-litecoin-sign" style="color: ${coinColor};"></i>`;
        }
        dropdownList.style.display = "none";
      };
    });
  }

  const sidebar = document.getElementById("app-sidebar");
  const overlay = document.getElementById("sidebar-overlay");
  const sidebarToggle = document.getElementById("sidebar-toggle");
  const sidebarClose = document.getElementById("sidebar-close");

  if (sidebarToggle && sidebar && overlay) {
    sidebarToggle.onclick = () => {
      sidebar.style.left = "0";
      overlay.style.display = "block";
    };
  }
  if (sidebarClose && sidebar && overlay) {
    sidebarClose.onclick = () => {
      sidebar.style.left = "-280px";
      overlay.style.display = "none";
    };
  }
  if (overlay && sidebar) {
    overlay.onclick = () => {
      sidebar.style.left = "-280px";
      overlay.style.display = "none";
    };
  }

  // Firebase modular: usa a mesma sessão e o mesmo projeto de firebase.js
  let saldoMYTUnsubscribe = null;

  window.atualizarSaldoMYT = function(balance) {
    const formatted = Number(balance || 0).toFixed(8);
    const activeName = document.getElementById("active-coin-name");
    const activeBalance = document.getElementById("active-coin-balance");
    const mytOptionBalance = document.querySelector(
      '.coin-option[data-coin="MYT"] span:last-child'
    );

    if (activeName && activeName.innerText === "MYT" && activeBalance) {
      activeBalance.innerText = formatted;
    }

    if (mytOptionBalance) {
      mytOptionBalance.innerText = formatted;
    }
  };

  onAuthStateChanged(auth, async (user) => {
    if (saldoMYTUnsubscribe) {
      saldoMYTUnsubscribe();
      saldoMYTUnsubscribe = null;
    }

    const nameTag = document.getElementById("header-username");
    const avatarIcon = document.getElementById("header-avatar");

    if (!user) {
      if (nameTag) nameTag.innerText = "Visitante";
      window.atualizarSaldoMYT(0);
      return;
    }

    const gameStateRef = doc(db, "users", user.uid, "game", "state");

    saldoMYTUnsubscribe = onSnapshot(gameStateRef, (gameDoc) => {
      if (gameDoc.exists()) {
        const gameState = gameDoc.data();
        window.atualizarSaldoMYT(gameState.balance);
      } else {
        window.atualizarSaldoMYT(0);
      }
    }, (error) => {
      console.error("Erro ao acompanhar saldo MYT:", error);
    });

    let displayName = user.displayName || (user.email ? user.email.split("@")[0] : "Jogador");
    let photoURL = user.photoURL || "";
    let playerId = "MYTRIA-ID";

    if (nameTag) nameTag.innerText = displayName;

    if (avatarIcon && photoURL) {
      avatarIcon.innerHTML = `<img src="${photoURL}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
    }

    try {
      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.playerId) playerId = data.playerId;
        if (data.photoURL) photoURL = data.photoURL;
        if (data.displayName) displayName = data.displayName;
      }

      if (nameTag) nameTag.innerText = `${displayName} (${playerId})`;

      if (avatarIcon && photoURL) {
        avatarIcon.innerHTML = `<img src="${photoURL}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
      }
    } catch (e) {
      console.error("Erro ao buscar perfil no Firestore:", e);
    }

    if (user.email === "khendel02@gmail.com") {
      const admItem = document.getElementById("adm-room-item");
      if (admItem) admItem.style.display = "block";
    }
  });

  // Logout: encerra a sessão Firebase sem apagar dados locais do navegador
  const btnLogout = document.getElementById("btn-logout");
  if (btnLogout) {
    btnLogout.onclick = async (e) => {
      e.preventDefault();
      try {
        await signOut(auth);
      } catch (err) {
        console.error("Erro ao sair da conta:", err);
      }
    };
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initHeader);
} else {
  initHeader();
}
