# Driver MicroPython de la camera Arducam HM01B0 (monochrome, QVGA), en mode
# 1 bit : un seul fil de donnees (D0), 8 fronts de PCLK par pixel.
#
# Porte du driver C officiel d'Arducam (github.com/ArduCAM/RPI-Pico-Cam,
# dossier rp2040_hm01b0) : meme sequence de registres, meme programme PIO.
# Seule difference : le module utilise ici a son propre oscillateur, donc
# pas d'horloge MCLK ni de broche RESET a piloter depuis le Pico.

import micropython
import rp2
import time
from machine import Pin, SoftI2C

ADRESSE_I2C = 0x24

# Capteur en mode QVGA (registre 0x3010 = 1) : 324 x 244 pixels lus, une
# image de 79 Ko. Elle est ensuite reduite par 2 (moyenne de 2x2 pixels) en
# 162 x 122 avant envoi, pour rester leger en RAM et sur le WiFi.
LARGEUR = 324
HAUTEUR = 244

# Sequence d'initialisation d'Arducam (hm01b0_init.h), mode QVGA active.
_REGISTRES = (
    (0x0103, 0x00), (0x0100, 0x00), (0x1003, 0x08), (0x1007, 0x08),
    (0x3044, 0x0A), (0x3045, 0x00), (0x3047, 0x0A), (0x3050, 0xC0),
    (0x3051, 0x42), (0x3052, 0x50), (0x3053, 0x00), (0x3054, 0x03),
    (0x3055, 0xF7), (0x3056, 0xF8), (0x3057, 0x29), (0x3058, 0x1F),
    (0x3059, 0x1E), (0x3064, 0x00), (0x3065, 0x04), (0x1000, 0x43),
    (0x1001, 0x40), (0x1002, 0x32), (0x0350, 0x7F), (0x1006, 0x01),
    (0x1008, 0x00), (0x1009, 0xA0), (0x100A, 0x60), (0x100B, 0x90),
    (0x100C, 0x40), (0x3022, 0x01), (0x1012, 0x01), (0x2000, 0x07),
    (0x2003, 0x00), (0x2004, 0x1C), (0x2007, 0x00), (0x2008, 0x58),
    (0x200B, 0x00), (0x200C, 0x7A), (0x200F, 0x00), (0x2010, 0xB8),
    (0x2013, 0x00), (0x2014, 0x58), (0x2017, 0x00), (0x2018, 0x9B),
    (0x2100, 0x01), (0x2101, 0x5F), (0x2102, 0x0A), (0x2103, 0x03),
    (0x2104, 0x05), (0x2105, 0x02), (0x2106, 0x14), (0x2107, 0x02),
    (0x2108, 0x03), (0x2109, 0x03), (0x210A, 0x00), (0x210B, 0x80),
    (0x210C, 0x40), (0x210D, 0x20), (0x210E, 0x03), (0x210F, 0x00),
    (0x2110, 0x85), (0x2111, 0x00), (0x2112, 0xA0), (0x2150, 0x03),
    (0x0340, 0x01), (0x0341, 0x7A), (0x0342, 0x01), (0x0343, 0x77),
    (0x3010, 0x01),  # bit 0 : mode QVGA (324 x 244)
    (0x0383, 0x01), (0x0387, 0x01), (0x0390, 0x00), (0x3011, 0x70),
    (0x3059, 0x22),  # sortie 1 bit sur D0
    (0x3060, 0x30), (0x0101, 0x01), (0x0104, 0x01),
    (0x0100, 0x01),  # mode streaming : le capteur envoie des images en continu
)

# Registres materiels du RP2040/RP2350 (identiques sur les deux) : FIFO de
# reception de la machine d'etat 0 du PIO0, et son signal DREQ pour le DMA.
_PIO0_RXF0 = 0x50200020
_DREQ_PIO0_RX0 = 4


def _programme_capture(vsync, href, pclk):
    # Fabrique le programme PIO pour les broches donnees : les numeros de
    # GPIO doivent etre des constantes au moment de l'assemblage, et
    # asm_pio masque les variables globales du module (d'ou la closure).
    @rp2.asm_pio(in_shiftdir=rp2.PIO.SHIFT_LEFT, autopush=True, push_thresh=8,
                 fifo_join=rp2.PIO.JOIN_RX)
    def capture():
        # Debut d'image : front montant de VSYNC (fait cote PIO plutot
        # qu'en Python, pour ne pas rater le debut de la premiere ligne).
        wait(0, gpio, vsync)
        wait(1, gpio, vsync)
        wrap_target()
        wait(1, gpio, href)   # seulement pendant une ligne valide
        wait(1, gpio, pclk)   # front montant de l'horloge pixel
        in_(pins, 1)          # un bit de D0 ; 8 bits = 1 pixel -> FIFO
        wait(0, gpio, pclk)
        wrap()
    return capture


@micropython.viper
def _reduire_par_2(buf: ptr8, largeur: int, hauteur: int) -> int:
    # Moyenne de chaque bloc de 2x2 pixels, ecrite au debut du meme buffer
    # (sans risque : l'index d'ecriture reste toujours derriere la lecture).
    # Retourne le nombre d'octets de l'image reduite.
    dst = 0
    y = 0
    while y < hauteur - 1:
        ligne = y * largeur
        x = 0
        while x < largeur - 1:
            i = ligne + x
            buf[dst] = (buf[i] + buf[i + 1] + buf[i + largeur] + buf[i + largeur + 1]) >> 2
            dst += 1
            x += 2
        y += 2
    return dst


class HM01B0:
    """Capture d'images. Le buffer est alloue une fois pour toutes a la
    creation : a instancier au demarrage, avant le WiFi, pour trouver 79 Ko
    contigus en RAM."""

    # 4 octets d'en-tete (largeur, hauteur en big-endian) devant les pixels :
    # c'est exactement le message MQTT envoye a l'API.
    ENTETE = 4

    def __init__(self, scl, sda, vsync, href, pclk, d0, timeout_ms=1000):
        self.buf = bytearray(self.ENTETE + LARGEUR * HAUTEUR)
        self._mv = memoryview(self.buf)
        self._timeout_ms = timeout_ms
        self._i2c = SoftI2C(scl=Pin(scl), sda=Pin(sda), freq=100_000)
        self._d0 = Pin(d0, Pin.IN)
        for broche in (vsync, href, pclk):
            Pin(broche, Pin.IN)
        self._programme = _programme_capture(vsync, href, pclk)
        self._sm = rp2.StateMachine(0)
        self._dma = rp2.DMA()

    def _ecrire(self, registre, valeur):
        self._i2c.writeto_mem(ADRESSE_I2C, registre, bytes((valeur,)), addrsize=16)

    def demarrer(self):
        """Verifie que le capteur repond (identifiant 0x01B0) puis le
        configure. Leve OSError si la camera est absente ou mal cablee."""
        ident = self._i2c.readfrom_mem(ADRESSE_I2C, 0x0000, 2, addrsize=16)
        if ident != b"\x01\xb0":
            raise OSError("HM01B0 introuvable (id lu : %s)" % ident)
        for registre, valeur in _REGISTRES:
            self._ecrire(registre, valeur)
        time.sleep_ms(100)

    def capturer(self):
        """Capture une image et la reduit en 162 x 122. Retourne le message
        a publier (memoryview : en-tete + pixels), ou None si aucune image
        n'est arrivee avant le timeout (camera debranchee...)."""
        pixels = self._mv[self.ENTETE:]
        # init() remet le programme a son debut (attente de VSYNC) et vide
        # les FIFO : chaque capture repart proprement d'un debut d'image.
        self._sm.init(self._programme, in_base=self._d0)  # pleine vitesse
        ctrl = self._dma.pack_ctrl(size=0, inc_read=False, inc_write=True,
                                   treq_sel=_DREQ_PIO0_RX0)
        self._dma.config(read=_PIO0_RXF0, write=pixels, count=len(pixels),
                         ctrl=ctrl, trigger=True)
        self._sm.active(1)

        debut = time.ticks_ms()
        while self._dma.active():
            if time.ticks_diff(time.ticks_ms(), debut) > self._timeout_ms:
                self._sm.active(0)
                self._dma.active(0)
                return None
        self._sm.active(0)

        taille = _reduire_par_2(pixels, LARGEUR, HAUTEUR)
        largeur, hauteur = LARGEUR // 2, HAUTEUR // 2
        self.buf[0] = largeur >> 8
        self.buf[1] = largeur & 0xFF
        self.buf[2] = hauteur >> 8
        self.buf[3] = hauteur & 0xFF
        return self._mv[:self.ENTETE + taille]
