#include <SPI.h>
#include <Ethernet.h>
#include <Wiegand.h>

WIEGAND wg;

// ──────────────── CONFIG RÉSEAU ────────────────
byte mac[] = { 0xDE, 0xAD, 0xBE, 0xEF, 0xFE, 0xED };

// IP statique de l'Arduino (choisis une IP libre sur ton réseau)
IPAddress ip(172, 29, 19, 200);

// IP de ta VM — on tape directement sur le backend (port 3001)
// pour éviter de passer par le proxy qui demande CORS/auth
IPAddress server(172, 29, 19, 193);
const int serverPort = 3001;

// ──────────────── FONCTIONS ────────────────

void swapByte(byte *b1, byte *b2) {
  byte tmp = *b1;
  *b1 = *b2;
  *b2 = tmp;
}

unsigned long reverseCode(unsigned long code) {
  byte *b1 = (byte *)&code;
  byte *b2 = b1 + 1;
  byte *b3 = b1 + 2;
  byte *b4 = b1 + 3;

  swapByte(b1, b4);
  swapByte(b2, b3);

  code >>= 8;
  return code;
}

void sendToServer(unsigned long rawCode, unsigned long reversedCode, int wiegandType) {
  EthernetClient client;

  // Construire le JSON avec le reversed code comme card_id
  // (c'est celui que tu stockes dans rfid_badges.uid)
  String json = "{\"card_id\":\"";
  json += String(reversedCode, HEX);
  json += "\",\"raw_hex\":\"";
  json += String(rawCode, HEX);
  json += "\",\"wiegand_type\":";
  json += String(wiegandType);
  json += "}";

  Serial.print("Envoi: ");
  Serial.println(json);

  if (client.connect(server, serverPort)) {
    client.println("POST /rfid/scan HTTP/1.1");
    client.print("Host: ");
    client.println(server);
    client.println("Content-Type: application/json");
    client.print("Content-Length: ");
    client.println(json.length());
    client.println("Connection: close");
    client.println();
    client.println(json);

    // Lire la réponse
    unsigned long timeout = millis();
    while (client.connected() && millis() - timeout < 3000) {
      if (client.available()) {
        char c = client.read();
        Serial.print(c);
      }
    }
    client.stop();
    Serial.println();
    Serial.println("OK");
  } else {
    Serial.println("ERREUR - Connexion échouée");
  }
}

// ──────────────── SETUP ────────────────
void setup() {
  Serial.begin(9600);
  Serial.println("Démarrage RFID...");

  wg.begin();

  Ethernet.begin(mac, ip);
  delay(1000);

  Serial.print("IP Arduino: ");
  Serial.println(Ethernet.localIP());
  Serial.println("En attente de badge...");
}

// ──────────────── LOOP ────────────────
void loop() {
  if (wg.available()) {
    unsigned long rawCode = wg.getCode();
    unsigned long reversed = reverseCode(rawCode);
    int wType = wg.getWiegandType();

    Serial.print("Wiegand HEX = ");
    Serial.print(rawCode, HEX);
    Serial.print(", Reversed HEX = ");
    Serial.print(reversed, HEX);
    Serial.print(", DECIMAL = ");
    Serial.print(rawCode);
    Serial.print(", Type W");
    Serial.println(wType);

    sendToServer(rawCode, reversed, wType);
  }

  Ethernet.maintain();
}
