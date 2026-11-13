// Módulo de Gerenciamento do Tempo de Bloco (Next block in)
export class BlockTimer {
  constructor(durationInSeconds = 300, elementId = "next-block-timer") {
    this.timeLeft = durationInSeconds; // Padrão: 5 minutos (300 segundos) por bloco
    this.elementId = elementId;
    this.timer = null;
  }

  start() {
    this.timer = setInterval(() => {
      if (this.timeLeft <= 0) {
        // Quando o bloco fecha, reinicia o ciclo e distribui as recompensas (futuramente)
        this.timeLeft = 300; 
      }

      this.timeLeft--;
      this.updateUI();
    }, 1000);
  }

  updateUI() {
    const el = document.getElementById(this.elementId);
    if (el) {
      const minutes = Math.floor(this.timeLeft / 60).toString().padStart(2, '0');
      const seconds = (this.timeLeft % 60).toString().padStart(2, '0');
      el.innerText = `${minutes}:${seconds}`;
    }
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
  }
}
