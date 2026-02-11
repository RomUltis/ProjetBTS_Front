#ifndef ALERT_NOTIFIER_H
#define ALERT_NOTIFIER_H
#include "AlertNotifierStrategy.h"
#include <vector>

class AlertNotifier {
private:
    std::vector<AlertNotifierStrategy*> strategies;
public:
    void addStrategy(AlertNotifierStrategy* strategy);
    void onAlert(std::string description); // Appelée lors d'un accès non autorisé
};
#endif