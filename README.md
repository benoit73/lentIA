# lentIA — stack MQTT / API / dashboard

Stack Docker pour le projet scolaire lentIA (suivi d'un bac de lentilles avec
Raspberry Pi, capteurs et réseau de neurones).

## Composants

| Service            | Rôle                                                                 | Port(s)      |
|---------------------|-----------------------------------------------------------------------|--------------|
| `mosquitto`         | Broker MQTT                                                           | 1883, 9001 (WebSocket) |
| `postgres`          | Base de données des relevés                                           | 5432         |
| `api`               | Flask : s'abonne au MQTT, enregistre en base, expose l'API REST, sert le dashboard | 5000         |
| `mqtt-test-client`  | Publie des données aléatoires (à remplacer par le vrai Pico W)        | —            |

## Format des messages MQTT

Topic : `lentia/sensors/data`

```json
{
  "soil_humidity": 45.2,
  "air_humidity": 55.8,
  "temperature": 21.3,
  "luminosity": 62.0,
  "water_level": 78.5,
  "created_at": "2026-09-15T10:00:00+00:00"
}
```

`created_at` est optionnel : s'il est absent, l'API et le dashboard utilisent
l'heure de réception. Ton firmware Pico W (avec le capteur LM35 par exemple)
n'a qu'à publier ce même JSON sur ce même topic pour remplacer le client de
test.

## Lancer le stack

```bash
docker compose up --build
```

Puis ouvrir : http://localhost:5000

- Historique : chargé depuis Postgres via `/api/readings`.
- Temps réel : le dashboard se connecte directement au broker en MQTT over
  WebSocket (port 9001) et met à jour les cartes/graphes à chaque message.

Pour arrêter : `docker compose down` (ajouter `-v` pour aussi supprimer les
données stockées).

## API REST

- `GET /api/readings?limit=200` — historique (plus ancien → plus récent)
- `GET /api/readings/latest` — dernier relevé enregistré
- `GET /api/config` — infos de connexion MQTT pour le front (host/port websocket, topic)
- `GET /api/health` — healthcheck

## Où brancher le vrai matériel

Remplace (ou coupe) le service `mqtt-test-client` et fais publier ton Pico W
directement sur `lentia/sensors/data`, sur `<ip-du-serveur>:1883`, avec le
même format JSON. Rien d'autre à changer : l'API et le dashboard fonctionnent
déjà avec n'importe quelle source qui respecte ce format.

## Notes

- Authentification MQTT désactivée (`allow_anonymous true`) pour rester simple
  en développement/démo. À sécuriser (utilisateur/mot de passe ou certificats)
  avant un usage exposé sur Internet.
- Les identifiants Postgres (`lentia` / `lentia`) sont volontairement simples
  pour un projet scolaire ; à changer si le stack est exposé publiquement.
