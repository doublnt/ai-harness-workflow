package com.example.service;

import com.example.entity.Order;
import com.example.external.PaymentGatewayClient;
import com.example.repository.OrderRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Service
public class OrderService {

    private final OrderRepository orderRepository;
    private final KafkaTemplate<String, String> kafkaTemplate;
    private final PaymentGatewayClient paymentGateway;

    @Autowired
    public OrderService(
        OrderRepository orderRepository,
        KafkaTemplate<String, String> kafkaTemplate,
        PaymentGatewayClient paymentGateway
    ) {
        this.orderRepository = orderRepository;
        this.kafkaTemplate = kafkaTemplate;
        this.paymentGateway = paymentGateway;
    }

    // RISK: dual-write — @Transactional + kafkaTemplate.send in same method.
    // If the DB commit succeeds and Kafka send fails (or vice versa), the
    // system is inconsistent. Needs outbox pattern.
    @Transactional
    public Order placeOrder(String customerId, BigDecimal amount) {
        Order order = new Order();
        order.setId(java.util.UUID.randomUUID().toString());
        order.setCustomerId(customerId);
        order.setAmount(amount);
        order.setStatus("PENDING");
        orderRepository.save(order);

        kafkaTemplate.send("orders.created", order.getId(), order.getId());

        return order;
    }

    // RISK: self-invocation — calling this.markPaid() inside another method of
    // the same class bypasses the Spring proxy, so @Transactional has no effect.
    public void confirmOrder(String orderId) {
        Order order = orderRepository.findById(orderId).orElseThrow();
        String txId = paymentGateway.charge(orderId, order.getAmount());
        this.markPaid(orderId, txId);
    }

    @Transactional
    public void markPaid(String orderId, String txId) {
        orderRepository.updateStatus(orderId, "PAID");
    }

    // RISK: REQUIRES_NEW under load can exhaust the connection pool because
    // the outer transaction's connection is held while the new one runs.
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordAudit(String orderId, String action) {
        // ... audit log write
    }
}
