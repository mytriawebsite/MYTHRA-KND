import {
  initializeApp,
  getApps,
  getApp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";

import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  onAuthStateChanged,
  signOut as fbSignOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
  onSnapshot,
  runTransaction,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import {
  getFunctions,
  httpsCallable,
  connectFunctionsEmulator
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-functions.js";

import {
  connectAuthEmulator
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import {
  connectFirestoreEmulator
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Configuração oficial do MYTRIA02
const isLocalHost =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";

const emulatorRequested =
  new URLSearchParams(window.location.search).get("emulator") === "1";

if (emulatorRequested && !isLocalHost) {
  throw new Error("Modo de teste permitido somente em localhost.");
}

const useEmulators = isLocalHost && new URLSearchParams(window.location.search).get("firebase") === "emulator";

const firebaseConfig = useEmulators
  ? {
      apiKey: "demo-api-key",
      authDomain: "demo-mytria02.firebaseapp.com",
      projectId: "demo-mytria02",
      appId: "1:123456789:web:demo"
    }
  : {
      apiKey: "AIzaSyDbWMI07qlMj54Fc73NaJwJkTDI5zenKPk",
      authDomain: "mytria02.firebaseapp.com",
      projectId: "mytria02",
      storageBucket: "mytria02.firebasestorage.app",
      messagingSenderId: "533631860859",
      appId: "1:533631860859:web:125aece9d9c409fff7a2de",
      measurementId: "G-H9VHXQJ0YD"
    };

// Evita inicialização duplicada
const app = getApps().length
  ? getApp()
  : initializeApp(firebaseConfig);

// Serviços centrais
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app, "southamerica-east1");
export const installRackCallable = httpsCallable(functions, "installRack");
export const installMinerCallable = httpsCallable(functions, "installMiner");
export const removeMinerCallable = httpsCallable(functions, "removeMiner");
export const removeRackCallable = httpsCallable(functions, "removeRack");
export const initializePlayerCallable = httpsCallable(functions, "initializePlayer");

if (useEmulators) {
  connectAuthEmulator(auth, "http://127.0.0.1:9100", {
    disableWarnings: true
  });
  connectFirestoreEmulator(db, "127.0.0.1", 8081);
  connectFunctionsEmulator(functions, "127.0.0.1", 5002);
  console.info("MYTRIA: conectado aos emuladores de teste.");
}

// Persistência da autenticação
export const authReady = setPersistence(auth, browserLocalPersistence)
  .catch((error) => {
    console.error("Erro ao configurar persistência:", error);
    throw error;
  });

// Encerramento da sessão sem apagar dados do navegador
export async function signOut(authInstance = auth) {
  try {
    await fbSignOut(authInstance);
    window.location.href = "login2.html";
  } catch (error) {
    console.error("Erro ao realizar logout:", error);
    throw error;
  }
}

// Funções compartilhadas pelos módulos
export {
  onAuthStateChanged,
  doc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
  onSnapshot,
  runTransaction,
  serverTimestamp
};
