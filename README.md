# lentIA — stack MQTT / API / dashboard

Stack Docker pour le projet scolaire lentIA (suivi d'un bac de lentilles avec
Raspberry Pi, capteurs et réseau de neurones).

## Composants

| Service            | Rôle                                                                 | Port(s)      |
|---------------------|-----------------------------------------------------------------------|--------------|
| `mosquitto`         | Broker MQTT                                                           | 1883         |
| `postgres`          | Base de données des relevés                                           | 5432         |
| `api`               | Flask : s'abonne au MQTT, enregistre en base, expose l'API REST + WebSocket (protégées par OAuth) | 5000         |
| `dashboard`         | Dashboard React (`web/`), servi par nginx qui relaie `/api` et `/ws` vers `api` | 80           |
| `mqtt-test-client`  | Publie des données aléatoires (à remplacer par le vrai Pico W)        | —            |

> Le dashboard à ouvrir est **http://localhost** (React, port 80). L'ancienne page
> statique servie par Flask sur `/` (port 5000) reste dans `api/templates` et
> `api/static` mais n'est plus authentifiée : depuis que l'API exige un token
> OAuth (voir plus bas), ses appels REST/WebSocket échouent (401). Elle est
> conservée pour référence mais considérée comme remplacée par `web/`.

### Découpage de l'API (`api/`)

| Module            | Rôle                                                                 |
|--------------------|-----------------------------------------------------------------------|
| `config.py`        | Configuration (variables d'environnement)                             |
| `db.py`             | Accès Postgres : relevés, journal/état des actionneurs, règles d'automatisation |
| `mqtt_ingest.py`    | Client MQTT interne : abonnement, persistance en base, diffusion temps réel |
| `realtime.py`       | Pub/sub en mémoire entre `mqtt_ingest` et les routes WebSocket         |
| `routes.py`         | Routes HTTP REST (santé, capteurs, actionneurs, journal, automatisation) |
| `ws.py`             | Routes WebSocket, une par capteur                                     |
| `auth.py`           | Vérification des ID tokens Google (OAuth) : décorateur `require_auth` pour le REST, `verify_token` pour le WebSocket |
| `automation.py`     | Thread de fond : évalue les règles d'automatisation toutes les ~30s   |
| `app.py`            | Point d'entrée : assemble l'app Flask, démarre le client MQTT et le thread d'automatisation |

### Dashboard React (`web/`)

| Dossier/fichier              | Rôle                                                            |
|--------------------------------|------------------------------------------------------------------|
| `src/auth/`                     | Connexion Google Sign-In (`AuthContext`, bouton, garde `RequireAuth`) |
| `src/pages/CarouselShell.tsx`   | Fait tourner Dashboard/Contrôle/Journal/Automatisation dans le cylindre 3D (`PageCylinder`) |
| `src/pages/Dashboard.tsx`       | Page d'accueil : grille des 5 capteurs + sélecteur de plage      |
| `src/pages/ControlPage.tsx`     | Page « Contrôle » : actionneurs, aperçu du journal, retour caméra |
| `src/pages/JournalPage.tsx`     | Journal complet : filtre par actionneur + plage, durée de chaque état |
| `src/pages/AutomationPage.tsx`  | Configuration des règles : plage horaire (lumière), seuils (arrosage, ventilation) |
| `src/pages/SensorDetail.tsx`    | Détail d'un capteur : graphe + sélecteur de plage d'historique   |
| `src/components/PageCylinder.tsx` | Carrousel 3D (glisser souris/tactile + flèches + clavier)     |
| `src/components/ActuatorPanel.tsx` | Tableau lumière/chauffage/arrosage/ventilation (juste les interrupteurs) |
| `src/components/JournalPreview.tsx` | Aperçu des dernières actions dans la page Contrôle, lien vers le journal complet |
| `src/components/CameraPanel.tsx`   | Emplacement retour caméra (placeholder tant qu'il n'y a pas de caméra) |
| `src/hooks/`                    | `useSensorHistory`/`useSensorRealtime`/`useLiveSeries` (capteurs), `usePolling` (actionneurs/journal) |
| `src/api.ts`                    | Client API (fetch + URL WebSocket), toujours en chemins relatifs |
| `nginx.conf`                    | Sert le build statique + relaie `/api` et `/ws` vers `api:5000`  |

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

### Détection de capteur hors ligne

Le dashboard ne fait confiance qu'aux messages WebSocket réellement reçus :
`useSensorRealtime` (`web/src/hooks/useSensorRealtime.ts`) retient l'horodatage
du dernier message par capteur et affiche un badge **Hors ligne** (rouge) dès
que ce délai dépasse `SENSOR_STALE_MS` (`web/src/config.ts`, 15 secondes par
défaut) — que la WebSocket elle-même soit coupée ou juste silencieuse (Pico
éteint, capteur débranché, sans que la connexion à l'API ne tombe). Le badge
repasse à **En ligne** (vert) dès qu'un nouveau message arrive.

Le même seuil sert aux courbes, qui sont **vivantes** et pas de simples
instantanés REST : `useLiveSeries` (`web/src/hooks/useLiveSeries.ts`) greffe
chaque nouvelle valeur WebSocket sur l'historique déjà chargé, et fait
avancer un curseur « maintenant » (`rightEdge`, sur un axe X numérique en
temps réel, pas catégoriel) toutes les secondes — même sans nouvelle donnée,
pour qu'on voie le temps passer. `withGapBreaks` (`web/src/chartGaps.ts`)
insère un point `null` entre deux relevés réels trop espacés, et un point de
rupture est aussi ajouté juste après le dernier relevé dès que le silence
dépasse le seuil : la ligne s'arrête net (pas de fausse continuité), reste
blanche pendant que « maintenant » continue d'avancer, puis reprend avec un
nouveau segment dès la reconnexion — laissant un vrai trou visuel entre les
deux. Ce comportement live ne s'applique qu'aux préréglages relatifs (1h,
24h, 7j, 30j) ; en préréglage **Personnalisé** (plage figée choisie par
l'utilisateur), le graphe reste un instantané de cette plage, sans curseur
« maintenant » ni valeurs temps réel ajoutées après coup.

## Actionneurs (lumière, chauffage, arrosage, ventilation)

Pas de matériel branché pour l'instant, mais le circuit complet existe déjà
côté logiciel : le dashboard (page **Contrôle**) peut activer/désactiver les
4 actionneurs (à la main, ou via des règles d'automatisation — voir plus
bas), l'API enregistre chaque commande en base et la publie sur MQTT, et le
firmware Pico (`pico/main.py`) s'y abonne déjà pour piloter les relais dès
qu'ils seront câblés.

Un topic de commande par actionneur, sous le préfixe `lentia/actuators/` :

| Topic                              | Actionneur  |
|--------------------------------------|-------------|
| `lentia/actuators/light/set`         | Lumière     |
| `lentia/actuators/heating/set`       | Chauffage   |
| `lentia/actuators/watering/set`      | Arrosage    |
| `lentia/actuators/ventilation/set`   | Ventilation |

Payload : une valeur JSON booléenne, `true` (activer) ou `false`
(désactiver) — même format que les topics de capteurs.

```
lentia/actuators/light/set     -> true
lentia/actuators/watering/set  -> false
```

Le Pico s'abonne à `lentia/actuators/+/set` et met à jour la broche du relais
correspondant (`ACTUATOR_PINS` dans `pico/main.py`, à adapter au câblage
réel). Il n'y a pour l'instant **aucun retour physique** : l'état affiché
dans le dashboard est celui de la dernière commande envoyée, pas une
confirmation matérielle.

Contrairement aux capteurs, les actionneurs et le journal n'ont pas de canal
WebSocket dédié : `ActuatorPanel`, `JournalPreview` et `JournalPage`
repassent chacun toutes les `ACTUATOR_POLL_MS` (`web/src/config.ts`, 5
secondes par défaut — `usePolling`) pour refléter les actions faites
ailleurs (un autre onglet/appareil, ou une règle d'automatisation qui se
déclenche en tâche de fond).

## Automatisation

La page **Automatisation** du dashboard configure des règles évaluées côté
serveur (`api/automation.py`, toutes les `AUTOMATION_POLL_SECONDS` — 30s par
défaut) qui déclenchent les mêmes commandes qu'un interrupteur manuel, mais
avec `source: "auto"` dans le journal. Deux types de règles :

- **Plage horaire** (`schedule`) — utilisée pour la lumière : activé entre
  une heure de début et de fin (ex. 07:00–21:00), désactivé en dehors.
- **Seuil sur une moyenne** (`threshold`) — utilisée pour l'arrosage
  (humidité du sol moyenne sur une fenêtre configurable, ex. en dessous de
  35% sur 60 min → arroser) et la ventilation (température **ou** humidité
  de l'air moyenne, au choix, ex. au-dessus de 28°C sur 15 min → ventiler).
  La moyenne est calculée sur les relevés Postgres (`db.fetch_sensor_average`),
  pas seulement sur ce qui est actuellement en mémoire.

Chaque actionneur n'a qu'une seule règle active à la fois (activer/désactiver
+ reconfigurer remplace la précédente). Une règle désactivée (`enabled:
false`) est ignorée par le moteur d'automatisation.

> Une règle active reprend la main au prochain contrôle (~30s) même après un
> changement manuel : si tu veux garder le contrôle manuel d'un actionneur,
> désactive d'abord sa règle sur la page Automatisation.

`GET /api/automation/rules` (toutes les règles) et
`PUT /api/automation/rules/<actionneur>` (créer/remplacer la règle d'un
actionneur) suivent le même schéma d'authentification que le reste de l'API :

```bash
curl -X PUT -H "Authorization: Bearer $ID_TOKEN" -H "Content-Type: application/json" \
  -d '{"enabled": true, "rule_type": "threshold", "config": {"sensor": "soil_humidity", "comparator": "below", "threshold": 35, "window_minutes": 60}}' \
  http://localhost:5000/api/automation/rules/watering
```

## Authentification (OAuth)

L'API et le dashboard sont protégés par Google Sign-In (OpenID Connect) :
seuls les comptes Google listés dans `ALLOWED_EMAILS` peuvent voir les
données des capteurs.

### 1. Créer un Client ID OAuth Google

1. Va sur [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   (crée un projet si besoin).
2. **Créer des identifiants** → **ID client OAuth** → type d'application
   **Application Web**.
3. Dans **Origines JavaScript autorisées**, ajoute :
   - `http://localhost` (dashboard en local/Docker, port 80)
   - l'URL de prod si tu déploies ailleurs
4. Aucune **URI de redirection** n'est nécessaire (on utilise Google
   Identity Services / Sign-In, pas le flux OAuth avec redirection).
5. Copie le **Client ID** généré (`....apps.googleusercontent.com`).

### 2. Configurer le projet

Copier le fichier d'exemple à la racine et le remplir :

```bash
cp .env.example .env
```

```dotenv
GOOGLE_CLIENT_ID=....apps.googleusercontent.com
ALLOWED_EMAILS=stroskanisation@gmail.com
```

- `GOOGLE_CLIENT_ID` est utilisé à la fois par l'API (pour vérifier les
  tokens) et par le build du dashboard (`docker-compose.yml` le passe comme
  `VITE_GOOGLE_CLIENT_ID` — variable d'environnement Vite intégrée au bundle
  au moment du `docker compose build`).
- `ALLOWED_EMAILS` : liste d'emails séparés par des virgules. Vide =
  n'importe quel compte Google valide est accepté.

`docker compose` lit automatiquement le fichier `.env` à la racine.

> `VITE_GOOGLE_CLIENT_ID` est intégré au bundle JS **au moment du build**, pas
> au démarrage : après avoir changé `.env`, il faut rebuilder l'image
> `dashboard` (`docker compose up -d --build dashboard`), un simple `restart`
> ne suffit pas.

### Comment ça marche

1. Le dashboard React affiche le bouton **Se connecter avec Google**
   (Google Identity Services). La connexion renvoie un *ID token* (JWT)
   signé par Google — jamais de mot de passe ou de secret côté client.
2. Ce token est envoyé à chaque appel :
   - REST : header `Authorization: Bearer <token>`
   - WebSocket : query string `?token=<token>` (un WebSocket ne porte pas
     de headers personnalisés lors du handshake navigateur)
3. L'API (`auth.py`) vérifie la signature du token auprès de Google, son
   audience (`GOOGLE_CLIENT_ID`), et que l'email figure dans
   `ALLOWED_EMAILS` (si cette liste n'est pas vide). Sinon : `401`.
4. `/api/health` reste public (healthcheck).

## Lancer le stack

```bash
docker compose up --build
```

Puis ouvrir : **http://localhost**

- Historique : chargé depuis Postgres, un fetch par capteur vers
  `/api/sensors/<capteur>/history`.
- Temps réel : le dashboard ouvre une connexion WebSocket par capteur vers
  `/ws/sensors/<capteur>`. L'API garde la connexion MQTT en interne (le
  navigateur ne parle jamais directement au broker).
- Navigation : **Dashboard**, **Contrôle** (actionneurs + caméra),
  **Journal** (historique des commandes) et **Automatisation** (règles)
  tournent dans un carrousel 3D — glisse à la souris ou au doigt, utilise
  les flèches gauche/droite, ou clique sur l'onglet en bas de l'écran.
  Cliquer sur un capteur reste une navigation classique vers sa page de
  détail (pas dans le carrousel).

Pour développer le dashboard sans rebuilder l'image Docker à chaque
changement :

```bash
cd web
cp .env.example .env.local   # renseigner VITE_GOOGLE_CLIENT_ID
npm install
npm run dev
```

Puis ouvrir http://localhost:5173 (l'API doit tourner sur :5000, via
`docker compose up api postgres mosquitto` par exemple — `vite.config.ts`
proxifie `/api` et `/ws` vers `localhost:5000`). Ajoute aussi
`http://localhost:5173` aux origines JavaScript autorisées dans Google Cloud
Console si tu développes ainsi.

Pour arrêter : `docker compose down` (ajouter `-v` pour aussi supprimer les
données stockées).

## API REST

Toutes les routes sauf `/api/health` exigent un header
`Authorization: Bearer <id_token>` valide (voir section OAuth ci-dessus).
Les exemples `curl` ci-dessous l'omettent pour rester lisibles — sans lui,
tu obtiendras `401`.

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
curl -H "Authorization: Bearer $ID_TOKEN" "http://localhost:5000/api/sensors/temperature/history?limit=3"
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
curl -i http://localhost:5000/api/sensors/temperature/history
# HTTP/1.1 401 UNAUTHORIZED (pas de token)
# {"error": "authentification requise"}

curl -i -H "Authorization: Bearer $ID_TOKEN" http://localhost:5000/api/sensors/poulet/history
# HTTP/1.1 404 NOT FOUND
# {"error": "capteur inconnu : poulet"}

curl -i -H "Authorization: Bearer $ID_TOKEN" "http://localhost:5000/api/sensors/temperature/history?start=hier"
# HTTP/1.1 400 BAD REQUEST
# {"error": "paramètre 'start' invalide, attendu ISO 8601"}
```

### `GET /api/actuators`

Liste des actionneurs connus.

```bash
curl -H "Authorization: Bearer $ID_TOKEN" http://localhost:5000/api/actuators
```

```json
["light", "heating", "watering", "ventilation"]
```

### `GET /api/actuators/state`

Dernier état connu de chaque actionneur (le plus récent événement en base ;
`false`/`null` si aucune commande n'a encore été envoyée).

```bash
curl -H "Authorization: Bearer $ID_TOKEN" http://localhost:5000/api/actuators/state
```

```json
{
  "light":       { "state": true,  "updated_at": "2026-09-17T09:40:13.123456+00:00" },
  "heating":     { "state": false, "updated_at": null },
  "watering":    { "state": false, "updated_at": null },
  "ventilation": { "state": false, "updated_at": null }
}
```

### `POST /api/actuators/<actionneur>/toggle`

Envoie une commande : enregistre l'événement en base (avec l'email de
l'utilisateur connecté, `source: "manual"`) puis publie sur
`lentia/actuators/<actionneur>/set`. Cette route est toujours `source: "manual"` — les commandes automatiques
(voir section Automatisation ci-dessous) passent par `api/automation.py`,
jamais par cette route.

```bash
curl -X POST -H "Authorization: Bearer $ID_TOKEN" -H "Content-Type: application/json" \
  -d '{"on": true}' http://localhost:5000/api/actuators/light/toggle
```

```json
{ "actuator": "light", "on": true }
```

### `GET /api/actuators/events`

Journal des commandes, du plus récent au plus ancien, avec la durée de
chaque état (jusqu'au changement suivant pour ce même actionneur —
`ended_at`/`duration_seconds` valent `null` si l'état est toujours en cours).

Paramètres de requête (tous optionnels) :

| Paramètre  | Défaut | Description                                            |
|------------|--------|----------------------------------------------------------|
| `limit`    | 50     | Nombre max d'événements (borné à 500)                     |
| `actuator` | —      | Ne renvoie que les événements de cet actionneur           |
| `start`    | —      | Timestamp ISO 8601, ne renvoie que `created_at >= start`  |
| `end`      | —      | Timestamp ISO 8601, ne renvoie que `created_at <= end`    |

```bash
curl -H "Authorization: Bearer $ID_TOKEN" "http://localhost:5000/api/actuators/events?actuator=light&limit=5"
```

```json
[
  {
    "id": 3,
    "actuator": "light",
    "state": true,
    "actor_email": "stroskanisation@gmail.com",
    "source": "manual",
    "created_at": "2026-09-17T09:40:13.123456+00:00",
    "ended_at": null,
    "duration_seconds": null
  },
  {
    "id": 2,
    "actuator": "light",
    "state": false,
    "actor_email": "stroskanisation@gmail.com",
    "source": "manual",
    "created_at": "2026-09-17T09:35:02.000000+00:00",
    "ended_at": "2026-09-17T09:40:13.123456+00:00",
    "duration_seconds": 311.123456
  }
]
```

## WebSocket temps réel

`ws://<host>:5000/ws/sensors/<capteur>?token=<id_token>` pousse chaque
nouvelle valeur de ce capteur dès que l'API reçoit le message MQTT
correspondant. Un message WebSocket = une valeur JSON brute (pas d'objet),
par exemple `21.3` ou `null` — jamais de `created_at` (c'est un flux temps
réel, l'historique est côté REST). La connexion est fermée immédiatement si
le capteur est inconnu ou si `token` est absent/invalide/non autorisé (voir
section OAuth) — un WebSocket ne porte pas de header `Authorization` lors du
handshake navigateur, d'où le token en query string.

Exemple JavaScript (c'est ce que fait `web/src/hooks/useSensorRealtime.ts`) :

```js
const socket = new WebSocket(`ws://localhost:5000/ws/sensors/temperature?token=${idToken}`);
socket.addEventListener("message", (event) => {
  const value = JSON.parse(event.data); // 21.3, ou null
  console.log("température :", value);
});
```

Exemple en ligne de commande avec [`websocat`](https://github.com/vi/websocat) :

```bash
websocat "ws://localhost:5000/ws/sensors/soil_humidity?token=$ID_TOKEN"
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

Pour les actionneurs (lumière, chauffage, arrosage, ventilation) : câble les relais sur
les broches définies dans `ACTUATOR_PINS` (`pico/main.py`, à adapter à ton
montage), rien d'autre à changer côté logiciel — le Pico écoute déjà
`lentia/actuators/+/set`.

## Notes

- Authentification MQTT désactivée (`allow_anonymous true`) pour rester simple
  en développement/démo. À sécuriser (utilisateur/mot de passe ou certificats)
  avant un usage exposé sur Internet.
- Les identifiants Postgres (`lentia` / `lentia`) sont volontairement simples
  pour un projet scolaire ; à changer si le stack est exposé publiquement.
- Le token OAuth du dashboard est stocké en `sessionStorage` (effacé à la
  fermeture de l'onglet, pas de refresh token) : suffisant pour ce projet,
  mais reste vulnérable en cas de XSS, comme tout stockage accessible en JS.
- `ALLOWED_EMAILS` vide accepte n'importe quel compte Google valide — mets-y
  au moins ta propre adresse avant de déployer ailleurs qu'en local.
- Les tables `actuator_events` (avec sa colonne `source`) et
  `automation_rules` sont définies dans `postgres/init.sql`, qui ne s'exécute
  qu'au tout premier démarrage d'un volume Postgres vide. Si ton volume
  existe déjà depuis avant ces fonctionnalités, crée ce qui manque à la main
  (voir les `CREATE TABLE`/`ALTER TABLE` dans `postgres/init.sql`), ou repars
  d'un volume propre (`docker compose down -v`, avec perte des données déjà
  stockées).
- `AUTOMATION_POLL_SECONDS` (défaut 30) règle la fréquence d'évaluation des
  règles d'automatisation — une valeur plus basse réagit plus vite mais
  interroge Postgres plus souvent.
