package com.example.service;

import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

@Service
public class OrderEventConsumer {

    // RISK: at-least-once delivery — handler must be idempotent.
    @KafkaListener(topics = "orders.created", groupId = "fulfillment")
    public void onOrderCreated(String orderId) {
        // ... process
    }
}
