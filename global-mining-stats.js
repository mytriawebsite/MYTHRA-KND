import { db, collection, getDocs } from "./firebase.js";

export async function calculateGlobalHashPower() {
  try {
    const usersRef = collection(db, "users");
    const querySnapshot = await getDocs(usersRef);
    
    let totalGlobalGh = 0;

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      totalGlobalGh += Number(data.hashPower || 0);
    });

    // Se houver apenas 1 jogador, o global é o dele. Se houver 10, é a soma dos 10.
    return totalGlobalGh;
  } catch (err) {
    console.error("Erro ao calcular hash power global:", err);
    return 0;
  }
}

// Formata o valor de GH/s para unidades maiores legíveis (MH/s, GH/s, TH/s, PH/s, EH/s)
export function formatHashPower(ghValue) {
  if (ghValue >= 1e9) {
    return (ghValue / 1e9).toFixed(2) + " Eh/s";
  } else if (ghValue >= 1e6) {
    return (ghValue / 1e6).toFixed(2) + " Ph/s";
  } else if (ghValue >= 1e3) {
    return (ghValue / 1e3).toFixed(2) + " Th/s";
  }
  return ghValue.toFixed(2) + " Gh/s";
}
