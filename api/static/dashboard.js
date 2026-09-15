// Dashboard lentIA
// - Historique : chargé une fois via l'API REST (données en base Postgres)
// - Temps réel : le navigateur se connecte DIRECTEMENT au broker MQTT
//   via WebSocket (port 9001) et met à jour cartes + graphes à la volée.

const METRICS = [
  { key: "soil_humidity", label: "Humidité du sol", unit: "%", color: "#a97142" },
  { key: "air_humidity", label: "Humidité de l'air", unit: "%", color: "#4ea1d3" },
  { key: "temperature", label: "Température", unit: "°C", color: "#e0724f" },
  { key: "luminosity", label: "Luminosité", unit: "%", color: "#e0c34f" },
  { key: "water_level", label: "Réservoir d'eau", unit: "%", color: "#4caf6e" },
];

const MAX_POINTS = 100; // nombre de points affichés dans les graphes

const cardsEl = document.getElementById("cards");
const chartsEl = document.getElementById("charts");
const statusEl = document.getElementById("connection-status");
const lastUpdateEl = document.getElementById("last-update");

const charts = {}; // key -> Chart.js instance

function setStatus(state, text) {
  statusEl.textContent = text;
  statusEl.className = `badge badge--${state}`;
}

function buildCardsAndCharts() {
  METRICS.forEach((m) => {
    // carte valeur courante
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div class="label">${m.label}</div>
      <div class="value" id="value-${m.key}">--<span class="unit"> ${m.unit}</span></div>
    `;
    cardsEl.appendChild(card);

    // graphe historique
    const box = document.createElement("div");
    box.className = "chart-box";
    box.innerHTML = `<h3>${m.label}</h3><canvas id="chart-${m.key}" height="140"></canvas>`;
    chartsEl.appendChild(box);

    const ctx = document.getElementById(`chart-${m.key}`).getContext("2d");
    charts[m.key] = new Chart(ctx, {
      type: "line",
      data: {
        labels: [],
        datasets: [
          {
            label: m.label,
            data: [],
            borderColor: m.color,
            backgroundColor: m.color + "33",
            tension: 0.25,
            pointRadius: 0,
            fill: true,
          },
        ],
      },
      options: {
        animation: false,
        responsive: true,
        scales: {
          x: { display: false },
          y: { beginAtZero: true },
        },
        plugins: { legend: { display: false } },
      },
    });
  });
}

function updateCards(reading) {
  METRICS.forEach((m) => {
    const el = document.getElementById(`value-${m.key}`);
    const v = reading[m.key];
    if (v !== null && v !== undefined) {
      el.innerHTML = `${Number(v).toFixed(1)}<span class="unit"> ${m.unit}</span>`;
    }
  });
  const ts = reading.created_at || new Date().toISOString();
  lastUpdateEl.textContent = `Dernière mise à jour : ${new Date(ts).toLocaleString("fr-FR")}`;
}

function pushPoint(reading) {
  const label = new Date(reading.created_at || Date.now()).toLocaleTimeString("fr-FR");
  METRICS.forEach((m) => {
    const chart = charts[m.key];
    const v = reading[m.key];
    if (v === null || v === undefined) return;
    chart.data.labels.push(label);
    chart.data.datasets[0].data.push(v);
    if (chart.data.labels.length > MAX_POINTS) {
      chart.data.labels.shift();
      chart.data.datasets[0].data.shift();
    }
    chart.update("none");
  });
}

async function loadHistory() {
  const res = await fetch("/api/readings?limit=" + MAX_POINTS);
  const rows = await res.json();
  rows.forEach((row) => pushPoint(row));
  if (rows.length > 0) {
    updateCards(rows[rows.length - 1]);
  }
}

async function connectMqtt() {
  const cfgRes = await fetch("/api/config");
  const cfg = await cfgRes.json();

  const url = `ws://${cfg.mqtt_ws_host}:${cfg.mqtt_ws_port}`;
  const client = mqtt.connect(url, { reconnectPeriod: 3000 });

  client.on("connect", () => {
    setStatus("ok", "MQTT : connecté (temps réel actif)");
    client.subscribe(cfg.mqtt_topic);
  });

  client.on("reconnect", () => setStatus("pending", "MQTT : reconnexion…"));
  client.on("close", () => setStatus("error", "MQTT : déconnecté"));
  client.on("error", () => setStatus("error", "MQTT : erreur"));

  client.on("message", (_topic, payload) => {
    try {
      const reading = JSON.parse(payload.toString());
      if (!reading.created_at) reading.created_at = new Date().toISOString();
      updateCards(reading);
      pushPoint(reading);
    } catch (err) {
      console.error("Message MQTT invalide", err);
    }
  });
}

buildCardsAndCharts();
loadHistory().catch((err) => console.error("Erreur chargement historique", err));
connectMqtt().catch((err) => {
  console.error("Erreur connexion MQTT", err);
  setStatus("error", "MQTT : indisponible");
});
