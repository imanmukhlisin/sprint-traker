export interface JogjaWeatherInfo {
  temp: number;
  label: string;
  advice: string;
  isHot: boolean;
}

export function getJogjaHeatAdvisory(): JogjaWeatherInfo {
  const hour = new Date().getHours();

  if (hour >= 11 && hour <= 14) {
    return {
      temp: 34,
      label: "Terik Menyengat",
      advice: "Utamakan tempat Indoor / Ber-AC agar tidak gerah",
      isHot: true,
    };
  }

  if (hour >= 15 && hour <= 17) {
    return {
      temp: 29,
      label: "Mulai Sejuk",
      advice: "Waktu terbaik buat jalan outdoor & foto-foto",
      isHot: false,
    };
  }

  if (hour >= 18 && hour <= 23) {
    return {
      temp: 25,
      label: "Adem Semilir",
      advice: "Nyaman buat kuliner malam & nongkrong santai",
      isHot: false,
    };
  }

  if (hour >= 6 && hour <= 10) {
    return {
      temp: 26,
      label: "Pagi Segar",
      advice: "Waktu nyaman sebelum matahari meninggi",
      isHot: false,
    };
  }

  // Dini hari
  return {
    temp: 23,
    label: "Dingin / Sejuk",
    advice: "Waktu istirahat",
    isHot: false,
  };
}
