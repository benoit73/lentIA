from machine import Pin, SPI, time_pulse_us
from dht import DHT22
import gc
import network
import time
import ujson
from umqtt.simple import MQTTClient
from hm01b0 import HM01B0

# ===== A REMPLACER =====
WIFI_SSID = "LentIA"
WIFI_PASSWORD = "Admin74!"

MQTT_BROKER = "98.66.161.191"      # IP du broker MQTT (VM Azure)
MQTT_PORT = 1883
MQTT_CLIENT_ID = "pico_terrarium"
MQTT_USER = None                   # None si le broker n'a pas d'authentification
MQTT_PASSWORD = None
MQTT_TOPIC_PREFIX = "lentia/sensors"  # un topic par capteur : lentia/sensors/<capteur>
ACTUATOR_TOPIC_PREFIX = "lentia/actuators"  # commandes : lentia/actuators/<actionneur>/set
CAMERA_TOPIC = "lentia/camera/frame"   # images de la camera (binaire, voir hm01b0.py)

SENSOR_INTERVAL_MS = 1000   # une mesure de chaque capteur par seconde
CAMERA_INTERVAL_MS = 250    # au plus 4 images/s (limite aussi le trafic WiFi)

# Camera Arducam HM01B0 (mode 1 bit). SCL/SDA en I2C logiciel : GP10/GP11
# ne correspondent pas a un bus I2C materiel dans ce sens-la.
CAMERA_PINS = {"scl": 10, "sda": 11, "vsync": 12, "href": 13, "pclk": 14, "d0": 15}

# HC-SR04 (niveau du reservoir) : distance capteur -> eau, en cm, a calibrer
# sur le reservoir reel.
RESERVOIR_FULL_CM = 5.0    # distance quand le reservoir est plein (eau haute, distance courte)
RESERVOIR_EMPTY_CM = 14.0  # distance quand le reservoir est vide = hauteur du capteur au-dessus du fond

# Broches des actionneurs. Lampe (relais) sur GP28 et pompe a eau sur GP18
# cablees ; chauffage et ventilation pas encore.
ACTUATOR_PINS = {
    "light": 28,
    "heating": 17,
    "watering": 18,
    "ventilation": 19,
}
# Beaucoup de modules relais s'activent a l'etat BAS : si un actionneur fait
# l'inverse de ce qu'affiche le dashboard, ajouter son nom ici, ex. {"light"}.
ACTUATOR_ACTIVE_LOW = set()

# Securite pompe : refusee / coupee quand le reservoir est vide, pour ne
# jamais la faire tourner a sec (meme si l'API ou le WiFi ne repondent plus).
POMPE = "watering"
NIVEAU_VIDE_PCT = 0.0
# ========================


# Camera creee en premier : son buffer d'image (79 Ko) doit etre alloue
# tant que la RAM n'est pas encore fragmentee par le WiFi et le MQTT.
gc.collect()
camera = None
try:
    camera = HM01B0(**CAMERA_PINS)
    camera.demarrer()
    print("Camera HM01B0 prete")
except (OSError, MemoryError) as e:
    print("Camera indisponible, on continue sans :", e)
    camera = None
    gc.collect()


def connect_wifi():
    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)
    wlan.connect(WIFI_SSID, WIFI_PASSWORD)
    print("Connexion au WiFi", end="")
    while not wlan.isconnected():
        print(".", end="")
        time.sleep(0.5)
    print("\nWiFi connecte, IP:", wlan.ifconfig()[0])
    return wlan


actuator_pins = {nom: Pin(broche, Pin.OUT) for nom, broche in ACTUATOR_PINS.items()}


def appliquer_actionneur(nom, etat):
    actif = 0 if nom in ACTUATOR_ACTIVE_LOW else 1
    actuator_pins[nom].value(actif if etat else 1 - actif)


def actionneur_allume(nom):
    actif = 0 if nom in ACTUATOR_ACTIVE_LOW else 1
    return actuator_pins[nom].value() == actif


# Dernier niveau du reservoir mesure (%), None tant qu'aucune mesure valide :
# sans mesure on ne bloque pas la pompe (capteur debranche != reservoir vide).
dernier_niveau_eau = None


def reservoir_vide():
    return dernier_niveau_eau is not None and dernier_niveau_eau <= NIVEAU_VIDE_PCT


for nom in actuator_pins:
    appliquer_actionneur(nom, False)  # tout eteint au demarrage


def on_actuator_command(topic, msg):
    """Callback MQTT : lentia/actuators/<actionneur>/set -> actionne le
    relais (ou la pompe) correspondant."""
    topic = topic.decode()
    prefixe = ACTUATOR_TOPIC_PREFIX + "/"
    if not topic.startswith(prefixe):
        return
    actionneur = topic[len(prefixe):].split("/")[0]
    if actionneur not in actuator_pins:
        return
    try:
        etat = ujson.loads(msg)
    except ValueError:
        return
    if actionneur == POMPE and etat and reservoir_vide():
        print("Pompe refusee : reservoir vide")
        return
    appliquer_actionneur(actionneur, etat)
    print("Actionneur", actionneur, "->", "ON" if etat else "OFF")


def connect_mqtt():
    client = MQTTClient(MQTT_CLIENT_ID, MQTT_BROKER, port=MQTT_PORT,
                         user=MQTT_USER, password=MQTT_PASSWORD)
    client.set_callback(on_actuator_command)
    client.connect()
    client.subscribe(("%s/+/set" % ACTUATOR_TOPIC_PREFIX).encode())
    print("Connecte au broker MQTT")
    return client


spi = SPI(0, baudrate=1000000, polarity=0, phase=0,
          sck=Pin(2), mosi=Pin(3), miso=Pin(4))
cs = Pin(5, Pin.OUT)
cs.value(1)


def lire_mcp3004(canal):
    cs.value(0)
    cmd = bytearray([1, (8 + canal) << 4, 0])
    resultat = bytearray(3)
    spi.write_readinto(cmd, resultat)
    cs.value(1)
    valeur = ((resultat[1] & 3) << 8) + resultat[2]
    return valeur


trig = Pin(0, Pin.OUT)
echo = Pin(1, Pin.IN)
trig.value(0)


def lire_distance_hcsr04():
    """Distance capteur -> obstacle (eau), en cm. None si pas d'echo (hors
    de portee ou capteur deconnecte)."""
    trig.value(0)
    time.sleep_us(2)
    trig.value(1)
    time.sleep_us(10)
    trig.value(0)
    try:
        duree_us = time_pulse_us(echo, 1, 30000)  # timeout 30ms (~5m max)
    except OSError:
        return None
    return duree_us / 58  # vitesse du son ~343 m/s, aller-retour


def distance_vers_niveau(distance_cm):
    """Convertit une distance HC-SR04 en % de remplissage du reservoir,
    borne entre 0 et 100."""
    if distance_cm is None:
        return None
    plage = RESERVOIR_EMPTY_CM - RESERVOIR_FULL_CM
    niveau = (RESERVOIR_EMPTY_CM - distance_cm) / plage * 100
    return max(0.0, min(100.0, niveau))


# DHT22 (humidite de l'air) sur GP6.
dht_sensor = DHT22(Pin(6))
DHT_MIN_INTERVAL_MS = 2100  # le DHT22 ne supporte pas plus d'une mesure/~2s
dht_derniere_lecture_ms = time.ticks_ms() - DHT_MIN_INTERVAL_MS
dht_derniere_humidite = None


def lire_dht22():
    """Humidite de l'air (%). Respecte l'intervalle minimal du capteur en ne
    mesurant pas plus souvent que DHT_MIN_INTERVAL_MS ; renvoie la derniere
    valeur connue entre deux mesures, ou en cas d'erreur de lecture."""
    global dht_derniere_lecture_ms, dht_derniere_humidite
    maintenant = time.ticks_ms()
    if time.ticks_diff(maintenant, dht_derniere_lecture_ms) < DHT_MIN_INTERVAL_MS:
        return dht_derniere_humidite
    dht_derniere_lecture_ms = maintenant
    try:
        dht_sensor.measure()
        dht_derniere_humidite = dht_sensor.humidity()
    except OSError as e:
        print("Erreur DHT22:", e)
    return dht_derniere_humidite


def lire_capteurs():
    brut = lire_mcp3004(0)  # canal 0 - LM35
    tension = brut * 3.3 / 1023
    temperature = tension * 100

    brut_hum = lire_mcp3004(1)  # canal 1 - humidite du sol
    humidite = (brut_hum / 1023) * 100

    brut_lum = lire_mcp3004(2)  # canal 2 - luminosite
    # Si le capteur est cable en pull-down (tension augmente avec la
    # lumiere), inverser en (1023 - brut_lum) / 1023 * 100.
    luminosite = (brut_lum / 1023) * 100

    distance = lire_distance_hcsr04()  # TRIG sur GP0, ECHO sur GP1
    niveau_eau = distance_vers_niveau(distance)

    humidite_air = lire_dht22()  # DHT22 sur GP6

    print("Brut:", brut, "| Tension:", tension, "V | Temp:", temperature, "C",
          "|| Brut hum:", brut_hum, "| Humidite:", humidite, "%",
          "|| Brut lum:", brut_lum, "| Luminosite:", luminosite, "%",
          "|| Distance:", distance, "cm | Niveau eau:", niveau_eau, "%",
          "|| Humidite air:", humidite_air, "%")

    readings = {
        "temperature": round(temperature, 1),
        "soil_humidity": round(humidite, 1),
        "air_humidity": round(humidite_air, 1) if humidite_air is not None else None,
        "luminosity": round(luminosite, 1),
        "water_level": round(niveau_eau, 1) if niveau_eau is not None else None,
    }
    return readings


def publier(topic, payload):
    """Publie un message, en se reconnectant au broker si besoin."""
    global mqtt
    try:
        mqtt.publish(topic, payload)
    except OSError as e:
        print("Erreur MQTT, reconnexion...", e)
        mqtt = connect_mqtt()


connect_wifi()
mqtt = connect_mqtt()

derniere_mesure = time.ticks_add(time.ticks_ms(), -SENSOR_INTERVAL_MS)
derniere_image = time.ticks_ms()

while True:
    maintenant = time.ticks_ms()

    if time.ticks_diff(maintenant, derniere_mesure) >= SENSOR_INTERVAL_MS:
        derniere_mesure = maintenant
        # Un topic par capteur (lentia/sensors/<capteur>), une valeur JSON
        # par message. None -> "null" pour les capteurs pas encore cables
        # (l'API les enregistre alors comme NULL en base).
        mesures = lire_capteurs()
        dernier_niveau_eau = mesures["water_level"]
        if reservoir_vide() and actionneur_allume(POMPE):
            appliquer_actionneur(POMPE, False)
            print("Pompe coupee : reservoir vide")
        for capteur, valeur in mesures.items():
            publier("%s/%s" % (MQTT_TOPIC_PREFIX, capteur), ujson.dumps(valeur))

    if camera is not None and time.ticks_diff(maintenant, derniere_image) >= CAMERA_INTERVAL_MS:
        derniere_image = maintenant
        image = camera.capturer()
        if image is None:
            print("Camera : aucune image recue (cablage ?)")
        else:
            publier(CAMERA_TOPIC, image)

    try:
        mqtt.check_msg()  # traite les commandes actionneurs recues (non bloquant)
    except OSError as e:
        print("Erreur MQTT (check_msg), reconnexion...", e)
        mqtt = connect_mqtt()

    time.sleep_ms(10)
