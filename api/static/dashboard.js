// Dashboard lentIA
// - Historique : un fetch par capteur vers /api/sensors/<capteur>/history
// - Temps réel : une connexion WebSocket par capteur vers /ws/sensors/<capteur>
//   (l'API relaie en interne les messages reçus sur MQTT, le navigateur ne
//   parle plus directement au broker).

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
const connectedSensors = new Set();

function setStatus(state, text) {
  statusEl.textContent = text;
  statusEl.className = `badge badge--${state}`;
}

function updateConnectionStatus() {
  if (connectedSensors.size === METRICS.length) {
    setStatus("ok", "Temps réel : connecté");
  } else if (connectedSensors.size === 0) {
    setStatus("error", "Temps réel : déconnecté");
  } else {
    setStatus("pending", `Temps réel : ${connectedSensors.size}/${METRICS.length} capteurs connectés`);
  }
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

function setCardValue(key, value) {
  const metric = METRICS.find((m) => m.key === key);
  const el = document.getElementById(`value-${key}`);
  if (!metric || !el) return;
  if (value === null || value === undefined) {
    el.innerHTML = `--<span class="unit"> ${metric.unit}</span>`;
  } else {
    el.innerHTML = `${Number(value).toFixed(1)}<span class="unit"> ${metric.unit}</span>`;
  }
}

function appendChartPoint(key, value, label) {
  const chart = charts[key];
  if (!chart || value === null || value === undefined) return;
  chart.data.labels.push(label);
  chart.data.datasets[0].data.push(value);
  if (chart.data.labels.length > MAX_POINTS) {
    chart.data.labels.shift();
    chart.data.datasets[0].data.shift();
  }
  chart.update("none");
}

function touchLastUpdate(timestamp) {
  const ts = timestamp || new Date().toISOString();
  lastUpdateEl.textContent = `Dernière mise à jour : ${new Date(ts).toLocaleString("fr-FR")}`;
}

async function loadSensorHistory(key) {
  const res = await fetch(`/api/sensors/${key}/history?limit=${MAX_POINTS}`);
  const rows = await res.json();
  rows.forEach((row) => {
    appendChartPoint(key, row.value, new Date(row.created_at).toLocaleTimeString("fr-FR"));
  });
  if (rows.length > 0) {
    const last = rows[rows.length - 1];
    setCardValue(key, last.value);
    touchLastUpdate(last.created_at);
  }
}

async function loadHistory() {
  await Promise.all(METRICS.map((m) => loadSensorHistory(m.key).catch((err) => {
    console.error(`Erreur chargement historique (${m.key})`, err);
  })));
}

function connectSensorSocket(key) {
  const protocol = location.protocol === "https:" ? "wss" : "ws";
  const socket = new WebSocket(`${protocol}://${location.host}/ws/sensors/${key}`);

  socket.addEventListener("open", () => {
    connectedSensors.add(key);
    updateConnectionStatus();
  });

  socket.addEventListener("close", () => {
    connectedSensors.delete(key);
    updateConnectionStatus();
    setTimeout(() => connectSensorSocket(key), 3000); // reconnexion automatique
  });

  socket.addEventListener("message", (event) => {
    let value;
    try {
      value = JSON.parse(event.data);
    } catch (err) {
      console.error(`Message WebSocket invalide (${key})`, err);
      return;
    }
    setCardValue(key, value);
    appendChartPoint(key, value, new Date().toLocaleTimeString("fr-FR"));
    touchLastUpdate();
  });
}

function connectRealtime() {
  METRICS.forEach((m) => connectSensorSocket(m.key));
}

buildCardsAndCharts();
loadHistory();
connectRealtime();
