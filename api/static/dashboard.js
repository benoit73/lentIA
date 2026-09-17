(() => {
  const sensors = ["soil_humidity", "air_humidity", "temperature", "luminosity", "water_level"];
  const formats = {
    soil_humidity: value => `${value.toFixed(1).replace(".", ",")}%`,
    air_humidity: value => `${value.toFixed(1).replace(",0", "").replace(".0", "")}%`,
    temperature: value => `${value.toFixed(1).replace(".", ",")}°C`,
    luminosity: value => `${Math.round(value).toLocaleString("fr-FR")} lux`,
    water_level: value => `${Math.round(value)}%`,
  };

  function render(sensor, value) {
    if (value === null || !Number.isFinite(Number(value))) return;
    const numeric = Number(value);
    document.querySelectorAll(`[data-sensor-value="${sensor}"]`).forEach(element => {
      element.textContent = formats[sensor](numeric);
    });
    if (sensor === "water_level") {
      const bounded = Math.max(0, Math.min(100, numeric));
      const fill = document.querySelector("[data-water-fill]");
      const tank = document.querySelector('[aria-label^="Réservoir rempli"]');
      if (fill) fill.style.width = `${bounded}%`;
      if (tank) {
        tank.setAttribute("aria-valuenow", String(bounded));
        tank.setAttribute("aria-label", `Réservoir rempli à ${Math.round(bounded)} %`);
      }
    }
  }

  async function loadHistory(sensor) {
    try {
      const response = await fetch(`/api/sensors/${sensor}/history?limit=200`);
      if (!response.ok) return;
      const history = await response.json();
      const latest = [...history].reverse().find(item => item.value !== null);
      if (latest) render(sensor, latest.value);
    } catch (_) {
      // Le dashboard conserve ses valeurs de démonstration si l'API est indisponible.
    }
  }

  function connect(sensor) {
    const protocol = location.protocol === "https:" ? "wss" : "ws";
    const socket = new WebSocket(`${protocol}://${location.host}/ws/sensors/${sensor}`);
    socket.addEventListener("message", event => render(sensor, JSON.parse(event.data)));
    socket.addEventListener("close", () => setTimeout(() => connect(sensor), 2000));
  }

  sensors.forEach(sensor => {
    loadHistory(sensor);
    connect(sensor);
  });
})();
