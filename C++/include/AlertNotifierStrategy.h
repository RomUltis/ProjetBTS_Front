#ifndef ALERT_NOTIFIER_STRATEGY_H
#define ALERT_NOTIFIER_STRATEGY_H
#include <string>

class AlertNotifierStrategy {
public:
    virtual ~AlertNotifierStrategy() {}
    virtual bool sendAlert(std::string description) = 0;
};
#endif