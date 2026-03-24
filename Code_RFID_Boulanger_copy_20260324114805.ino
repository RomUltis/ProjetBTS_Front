#include <Wiegand.h>

WIEGAND wg;

void setup() {
    Serial.begin(9600);  
    
    // default Wiegand Pin 2 and Pin 3 see image on README.md
    // for non UNO board, use wg.begin(pinD0, pinD1) where pinD0 and pinD1 
    // are the pins connected to D0 and D1 of wiegand reader respectively.
    wg.begin();
}

void swapByte(byte * b1, byte * b2)
{
 byte tmp = *b1;
 *b1 = *b2;
 *b2 = tmp;
}

void loop() {
    if(wg.available())
    {
        Serial.print("Wiegand HEX = ");
        Serial.print(wg.getCode(),HEX);

   unsigned long code = wg.getCode();
   byte * b1 = (byte*)&code;
   byte * b2 = b1 + 1;
   byte * b3 = b1 + 2;
   byte * b4 = b1 + 3;

   swapByte(b1, b4);
   swapByte(b2, b3);

   code >>= 8;

   Serial.print(", Reversed Wiegand HEX = ");
   Serial.print(code,HEX);
        Serial.print(", DECIMAL = ");
        Serial.print(wg.getCode());
        Serial.print(", Type W");
        Serial.println(wg.getWiegandType());    
    }
}