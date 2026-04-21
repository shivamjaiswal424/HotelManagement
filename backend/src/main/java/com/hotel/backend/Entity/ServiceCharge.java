package com.hotel.backend.Entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;

@Entity
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@Table(name = "service_charges")
public class ServiceCharge {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne @JoinColumn(name = "reservation_id")
    @JsonIgnore
    private Reservation reservation;

    private String description;
    private double amount;
    private LocalDate chargeDate;
}
