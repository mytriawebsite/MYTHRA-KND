import { db, doc, getDoc, updateDoc } from "./firebase.js";

// Módulo de Lógica de Mineração do Mytria
export class MiningEngine {
  constructor(userId) {
    this.userId = userId;
    this.hashPower = 0; // em GH/s
    this.balances = {};
    this.timer = null;
  }

  async init() {
    try {
      const userRef = doc(db, "users", this.userId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const data = userSnap.data();
        this.hashPower = data.hashPower || 0; // Puxa o power real ou 0 inicial
        this.balances = {
          MYT: data.mytBalance || 0,
          NTG: data.ntgBalance || 0,
          BTC: data.btcBalance || 0,
          DOGE: data.dogeBalance || 0,
          LAMME: data.lammeBalance || 0,
          SOL: data.solBalance || 0,
          ETH: data.ethBalance || 0
        };
      }
      this.startLoop();
    } catch (err) {
      console.error("Erro ao inicializar motor de mineração:", err);
    }
  }

  // Loop de cálculo de mineração (roda a cada 1 segundo em segundo plano)
  startLoop() {
    this.timer = setInterval(() => {
      if (this.hashPower <= 0) return;

      // Exemplo de fórmula base: 1 GH/s gera uma fração fracionada por segundo
      // (Futuramente ajustaremos a taxa exata baseada na dificuldade dos blocos)
      const rewardRate = (this.hashPower * 0.00000001); 
      
      // Acumula na moeda principal de mineração (ex: MYT)
      this.balances.MYT += rewardRate;

      // Dispara um evento customizado para a UI atualizar os números sem mexer no banco a cada segundo
      window.dispatchEvent(new CustomEvent('mytria:mining-tick', { 
        detail: { balances: this.balances, hashPower: this.hashPower } 
      }));

    }, 1000);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
  }
}
