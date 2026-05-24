package com.example.external;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

@Component
public class PaymentGatewayClient {

    private final RestTemplate restTemplate;

    @Autowired
    public PaymentGatewayClient(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public String charge(String orderId, java.math.BigDecimal amount) {
        return restTemplate.postForObject(
            "https://payments.example.com/charge",
            new ChargeRequest(orderId, amount),
            String.class
        );
    }

    record ChargeRequest(String orderId, java.math.BigDecimal amount) {}
}
