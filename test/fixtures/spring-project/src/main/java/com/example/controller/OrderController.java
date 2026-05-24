package com.example.controller;

import com.example.entity.Order;
import com.example.service.OrderService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderService orderService;

    @Autowired
    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @PostMapping
    public Order create(@RequestBody CreateOrderRequest req) {
        // RISK: trust boundary — req is untrusted, but no validation before
        // calling service.
        return orderService.placeOrder(req.customerId(), req.amount());
    }

    @PostMapping("/{id}/confirm")
    public void confirm(@PathVariable String id) {
        orderService.confirmOrder(id);
    }

    record CreateOrderRequest(String customerId, BigDecimal amount) {}
}
