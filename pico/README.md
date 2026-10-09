# Firmware Pico W — câblage

Résumé des broches utilisées par `main.py`. Tout est déjà câblé/testé sauf
mention contraire ; les valeurs viennent directement du code (source de
vérité si ça diverge un jour de ce fichier).

Fichiers à copier sur le Pico : **`main.py`** et **`hm01b0.py`** (driver de
la caméra, importé par `main.py`).

## Capteurs (via MCP3004, SPI0)

| Capteur                    | Canal MCP3004 | Topic MQTT                          | Statut |
|-----------------------------|:-------------:|--------------------------------------|--------|
| Température (LM35)          | 0             | `lentia/sensors/temperature`         | câblé  |
| Humidité du sol              | 1             | `lentia/sensors/soil_humidity`       | câblé  |
| Luminosité                   | 2             | `lentia/sensors/luminosity`          | câblé  |
| *(libre)*                    | 3             | —                                     | libre  |

Bus SPI0 vers le MCP3004 :

| Signal | Broche Pico |
|--------|:-----------:|
| SCK    | GP2         |
| MOSI   | GP3         |
| MISO   | GP4         |
| CS     | GP5         |

Le canal 3 du MCP3004 est libre pour un futur capteur analogique.

## Capteur d'humidité de l'air (DHT22)

| Signal | Broche Pico | Rôle                    |
|--------|:-----------:|--------------------------|
| DATA   | GP6         | Lecture humidité/température |

Topic : `lentia/sensors/air_humidity`. Le DHT22 ne supporte pas plus d'une
mesure toutes les ~2s (`DHT_MIN_INTERVAL_MS` dans `main.py`, qui garde la
dernière valeur connue entre deux mesures plutôt que de sur-solliciter le
capteur). Sa mesure de température n'est pas utilisée (on garde le LM35 sur
le MCP3004 pour `temperature`).

## Capteur de niveau (HC-SR04)

| Signal | Broche Pico | Rôle                                             |
|--------|:-----------:|---------------------------------------------------|
| TRIG   | GP0         | Déclenche la mesure                                |
| ECHO   | GP1         | Retour d'écho, distance capteur → surface de l'eau |

Topic : `lentia/sensors/water_level`. Calibrer `RESERVOIR_FULL_CM` /
`RESERVOIR_EMPTY_CM` dans `main.py` selon la profondeur réelle du réservoir
(actuellement 0 % = 8 cm du capteur, 100 % = 5 cm).

**Sécurité pompe** : quand le niveau mesuré tombe à 0 %, le Pico coupe la
pompe (`watering`) et refuse de la rallumer tant que le réservoir n'est pas
rempli, même si la commande vient du dashboard. Un capteur sans écho
(`None`) ne bloque pas la pompe.

## Actionneurs (relais)

| Actionneur   | Broche Pico | Topic de commande                     | Statut |
|--------------|:-----------:|-----------------------------------------|--------|
| Lumière (lampe, via relais) | GP28 | `lentia/actuators/light/set`     | câblé |
| Chauffage    | GP17        | `lentia/actuators/heating/set`         | **pas câblé** |
| Arrosage (pompe à eau) | GP18 | `lentia/actuators/watering/set`     | câblé |
| Ventilation  | GP19        | `lentia/actuators/ventilation/set`     | **pas câblé** |

Le firmware écoute ces topics et pilote la broche correspondante
(`ACTUATOR_PINS` dans `main.py`), à l'état haut pour « allumé ». Beaucoup de
modules relais s'activent au contraire à l'état **bas** : si la lampe
s'allume quand le dashboard dit « éteint » (et inversement), ajouter son nom
à `ACTUATOR_ACTIVE_LOW`, ex. `{"light"}`. Tout est éteint au démarrage du
Pico. Aucun retour matériel : l'état affiché côté dashboard est celui de la
dernière commande envoyée, pas une confirmation physique.

## Caméra (Arducam HM01B0, monochrome)

| Signal module | Broche Pico | Rôle                                       |
|---------------|:-----------:|---------------------------------------------|
| SCL           | GP10        | Configuration du capteur (I2C, adresse 0x24) |
| SDA           | GP11        | Configuration du capteur (I2C)              |
| VSYNC         | GP12        | Début d'image                                |
| HREF          | GP13        | Ligne valide                                 |
| PCLK          | GP14        | Horloge pixel                                |
| D0            | GP15        | Données (mode 1 bit : 8 coups de PCLK par pixel) |

Topic : `lentia/camera/frame` (binaire : 4 octets largeur/hauteur puis les
pixels en niveaux de gris, voir le README racine, section « Caméra »).

- Le driver (`hm01b0.py`) reprend la configuration du driver C officiel
  d'Arducam ; la capture se fait en PIO + DMA (machine d'état 0 du PIO0,
  `CAMERA_PINS` dans `main.py`).
- I2C **logiciel** : dans ce sens (SCL sur GP10, SDA sur GP11), les broches
  ne correspondent à aucun bus I2C matériel du Pico. Inverser les deux fils
  ne gênerait pas le driver tant que `CAMERA_PINS` suit.
- Image lue en 324 × 244, réduite à **162 × 122** avant envoi, au plus 4
  images/s (`CAMERA_INTERVAL_MS`). Le buffer (79 Ko) est alloué au tout
  début de `main.py`, avant le WiFi, pour trouver assez de RAM contiguë.
- Au démarrage, la console affiche `Camera HM01B0 prete`, ou `Camera
  indisponible` avec la raison (capteur qui ne répond pas en I2C, RAM...) :
  le reste du firmware (capteurs, actionneurs) continue alors sans caméra.
  `Camera : aucune image recue` en boucle = le capteur répond mais aucune
  image n'arrive (vérifier VSYNC/HREF/PCLK/D0).
