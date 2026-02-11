#include "../include/AlertNotifier.h"

void AlertNotifier::addStrategy(AlertNotifierStrategy* strategy) {
    strategies.push_back(strategy);
}

void AlertNotifier::onAlert(std::string description) {
    for (auto s : strategies) {
        s->sendAlert(description);
    }
}