# lentIA — stack MQTT / API / dashboard

Stack Docker pour le projet scolaire lentIA (suivi d'un bac de lentilles avec
Raspberry Pi, capteurs et réseau de neurones).

## Composants

| Service            | Rôle                                                                 | Port(s)      |
|---------------------|-----------------------------------------------------------------------|--------------|
| `mosquitto`         | Broker MQTT                                                           | 1883         |
| `postgres`          | Base de données des relevés                                           | 5432         |
| `api`               | Flask : s'abonne au MQTT, enregistre en base, expose l'API REST + WebSocket, sert le dashboard | 5000         |
| `mqtt-test-client`  | Publie des données aléatoires (à remplacer par le vrai Pico W)        | —            |

### Découpage de l'API (`api/`)

| Module            | Rôle                                                                 |
|--------------------|-----------------------------------------------------------------------|
| `config.py`        | Configuration (variables d'environnement)                             |
| `db.py`             | Accès Postgres : écriture des relevés, historique par capteur         |
| `mqtt_ingest.py`    | Client MQTT interne : abonnement, persistance en base, diffusion temps réel |
| `realtime.py`       | Pub/sub en mémoire entre `mqtt_ingest` et les routes WebSocket         |
| `routes.py`         | Routes HTTP REST (santé, liste des capteurs, historique)              |
| `ws.py`             | Routes WebSocket, une par capteur                                     |
| `app.py`            | Point d'entrée : assemble l'app Flask et démarre le client MQTT       |

## Format des messages MQTT

Un topic par capteur, sous le préfixe `lentia/sensors/` :

| Topic                          | Capteur                  |
|---------------------------------|---------------------------|
| `lentia/sensors/soil_humidity`  | Humidité du sol            |
| `lentia/sensors/air_humidity`   | Humidité de l'air           |
| `lentia/sensors/temperature`    | Température                |
| `lentia/sensors/luminosity`     | Luminosité                 |
| `lentia/sensors/water_level`    | Niveau du réservoir d'eau  |

Chaque message ne contient que la valeur JSON du capteur (pas d'objet), par
exemple `21.3` sur `lentia/sensors/temperature`, ou `null` si le capteur
n'est pas encore câblé :

```
lentia/sensors/temperature   -> 21.3
lentia/sensors/soil_humidity -> 45.2
lentia/sensors/air_humidity  -> null
```

L'API s'abonne au wildcard `lentia/sensors/+` et enregistre une ligne en base
par message reçu (les autres colonnes restent `NULL` sur cette ligne — un
message ne porte la valeur que d'un seul capteur). Ton firmware Pico W n'a
qu'à publier sur ces mêmes topics, avec `null` pour les capteurs pas encore
câblés, pour remplacer le client de test.

## Lancer le stack

```bash
docker compose up --build
```

Puis ouvrir : http://localhost:5000

- Historique : chargé depuis Postgres, un fetch par capteur vers
  `/api/sensors/<capteur>/history`.
- Temps réel : le dashboard ouvre une connexion WebSocket par capteur vers
  `/ws/sensors/<capteur>`. L'API garde la connexion MQTT en interne (le
  navigateur ne parle plus directement au broker).

Pour arrêter : `docker compose down` (ajouter `-v` pour aussi supprimer les
données stockées).

## API REST

### `GET /api/health`

Healthcheck.

```bash
curl http://localhost:5000/api/health
```

```json
{ "status": "ok", "time": "2026-09-16T09:05:19.673487+00:00" }
```

### `GET /api/sensors`

Liste des capteurs connus (les mêmes noms que dans les topics MQTT et les
colonnes de la table `readings`).

```bash
curl http://localhost:5000/api/sensors
```

```json
["soil_humidity", "air_humidity", "temperature", "luminosity", "water_level"]
```

### `GET /api/sensors/<capteur>/history`

Historique d'un capteur, du plus ancien au plus récent. Chaque relevé
`{value, created_at}` correspond à un message MQTT reçu sur
`lentia/sensors/<capteur>` (voir ci-dessous) ; `value` peut être `null` si le
capteur avait publié `null` à ce moment-là (pas encore câblé).

Paramètres de requête (tous optionnels) :

| Paramètre | Défaut | Description                                         |
|-----------|--------|------------------------------------------------------|
| `limit`   | 200    | Nombre max de relevés (borné à 2000)                  |
| `start`   | —      | Timestamp ISO 8601, ne renvoie que `created_at >= start` |
| `end`     | —      | Timestamp ISO 8601, ne renvoie que `created_at <= end`   |

```bash
curl "http://localhost:5000/api/sensors/temperature/history?limit=3"
```

```json
[
  { "value": 20.7, "created_at": "2026-09-16T09:04:55.895116+00:00" },
  { "value": 21.0, "created_at": "2026-09-16T09:05:00.891605+00:00" },
  { "value": 21.0, "created_at": "2026-09-16T09:05:05.892771+00:00" }
]
```

Filtrer sur une plage précise :

```bash
curl "http://localhost:5000/api/sensors/water_level/history?start=2026-09-16T08:00:00Z&end=2026-09-16T09:00:00Z&limit=500"
```

Erreurs :

```bash
curl -i http://localhost:5000/api/sensors/poulet/history
# HTTP/1.1 404 NOT FOUND
# {"error": "capteur inconnu : poulet"}

curl -i "http://localhost:5000/api/sensors/temperature/history?start=hier"
# HTTP/1.1 400 BAD REQUEST
# {"error": "paramètre 'start' invalide, attendu ISO 8601"}
```

## WebSocket temps réel

`ws://<host>:5000/ws/sensors/<capteur>` pousse chaque nouvelle valeur de ce
capteur dès que l'API reçoit le message MQTT correspondant. Un message
WebSocket = une valeur JSON brute (pas d'objet), par exemple `21.3` ou
`null` — jamais de `created_at` (c'est un flux temps réel, l'historique est
côté REST). Se connecter sur un capteur inconnu ferme la connexion
immédiatement.

Exemple JavaScript (c'est ce que fait `dashboard.js`) :

```js
const socket = new WebSocket("ws://localhost:5000/ws/sensors/temperature");
socket.addEventListener("message", (event) => {
  const value = JSON.parse(event.data); // 21.3, ou null
  console.log("température :", value);
});
```

Exemple en ligne de commande avec [`websocat`](https://github.com/vi/websocat) :

```bash
websocat ws://localhost:5000/ws/sensors/soil_humidity
# 45.2
# 44.8
# 45.0
# ...
```

## Où brancher le vrai matériel

Remplace (ou coupe) le service `mqtt-test-client` et fais publier ton Pico W
directement sur les topics `lentia/sensors/<capteur>`, sur
`<ip-du-serveur>:1883`, avec le même format (une valeur JSON par message).
Rien d'autre à changer : l'API et le dashboard fonctionnent déjà avec
n'importe quelle source qui respecte ce format.

## Notes

- Authentification MQTT désactivée (`allow_anonymous true`) pour rester simple
  en développement/démo. À sécuriser (utilisateur/mot de passe ou certificats)
  avant un usage exposé sur Internet.
- Les identifiants Postgres (`lentia` / `lentia`) sont volontairement simples
  pour un projet scolaire ; à changer si le stack est exposé publiquement.
