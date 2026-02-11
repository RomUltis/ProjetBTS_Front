#include "../include/AlertNotifier.h"
#include "../include/SMSAlertNotifierStrategy.h"

int main() {
    AlertNotifier alerteur;
    SMSAlertNotifierStrategy smsOvh;

    alerteur.addStrategy(&smsOvh);
    alerteur.onAlert("Acces non autorise detecte dans le Labo !");

    return 0;
}