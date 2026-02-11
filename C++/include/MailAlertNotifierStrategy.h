#ifndef SMS_ALERT_NOTIFIER_STRATEGY_H
#define SMS_ALERT_NOTIFIER_STRATEGY_H

#include "AlertNotifierStrategy.h"
#include <iostream>

class SMSAlertNotifierStrategy : public AlertNotifierStrategy {
public:
    // Implémentation de l'envoi de SMS
    bool sendAlert(std::string message) override {
        // Pour l'instant, on simule l'envoi pour tester la structure
        std::cout << "APPEL API OVH [SMS] : " << message << std::endl;
        
        // Plus tard, on insérera ici le code avec la lib 'curl' 
        // pour envoyer la requête POST à https://eu.api.ovh.com/1.0/sms/
        
        return true; 
    }
};

#endif