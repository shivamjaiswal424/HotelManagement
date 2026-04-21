package com.hotel.backend.Entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;

@Entity
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@Table(name = "payments")
public class Payment {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne @JoinColumn(name = "reservation_id")
    @JsonIgnore
    private Reservation reservation;

    private double amount;

    @Enumerated(EnumType.STRING)
    private PaymentMode paymentMode;

    private LocalDate paymentDate;
    private String remarks;
}
