import { initializeApp, getApps, getApp } from
  "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";

import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyArZXNIjoIDqaid3CMBwYG0kreEFMfQc7Y",
  authDomain: "mytria01.firebaseapp.com",
  projectId: "mytria01",
  storageBucket: "mytria01.firebasestorage.app",
  messagingSenderId: "327833626714",
  appId: "1:327833626714:web:fde0eba45a9afca54a5063",
  measurementId: "G-2B3K1SLF4S"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

onAuthStateChanged(auth, user => {
  if (!user) {
    window.location.replace("login.html");
    return;
  }

  if (document.getElementById("mytria-logout-button")) return;

  const button = document.createElement("button");
  button.id = "mytria-logout-button";
  button.type = "button";
  button.textContent = "⏻ Sair";
  button.style.cssText = [
    "position:fixed",
    "right:14px",
    "bottom:16px",
    "z-index:9999",
    "padding:12px 18px",
    "border:1px solid #ff7777",
    "border-radius:10px",
    "background:#8e202b",
    "color:white",
    "font-weight:700",
    "box-shadow:0 4px 18px #0008"
  ].join(";");

  button.addEventListener("click", async () => {
    if (button.disabled) return;

    button.disabled = true;
    button.textContent = "Saindo...";

    try {
      await signOut(auth);
      window.location.replace("login.html");
    } catch (error) {
      console.error("Erro ao sair:", error);
      button.disabled = false;
      button.textContent = "⏻ Sair";
      alert("Não foi possível sair. Verifique a conexão e tente novamente.");
    }
  });

  document.body.appendChild(button);
});
