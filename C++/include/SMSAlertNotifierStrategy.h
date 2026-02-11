#ifndef SMS_ALERT_STRATEGY_H
#define SMS_ALERT_STRATEGY_H
#include "AlertNotifierStrategy.h"

class SMSAlertNotifierStrategy : public AlertNotifierStrategy {
public:
    bool sendAlert(std::string description) override;
};
#endif