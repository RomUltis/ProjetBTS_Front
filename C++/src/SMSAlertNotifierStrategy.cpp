#include "../include/SMSAlertNotifierStrategy.h"
#include <iostream>

bool SMSAlertNotifierStrategy::sendAlert(std::string description) {
    std::cout << "ALERTE SMS (via Cloud OVH) : " << description << std::endl;
    // Plus tard : intégration de la libcurl pour l'appel API réel
    return true;
}