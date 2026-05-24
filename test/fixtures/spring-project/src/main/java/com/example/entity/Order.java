package com.example.entity;

import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "orders")
public class Order {
    @Id
    private String id;
    private String customerId;
    private BigDecimal amount;
    private String status;
    private Instant createdAt;
}
