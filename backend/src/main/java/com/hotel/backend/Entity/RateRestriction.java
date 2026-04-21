package com.hotel.backend.Entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;

@Entity
@Table(name = "rate_restrictions",
       uniqueConstraints = @UniqueConstraint(columnNames = {"ratePlanId", "date"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RateRestriction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long ratePlanId;
    private LocalDate date;

    private Boolean stopSell;
    private Boolean closeOnArrival;
    private Boolean closeOnDeparture;
    private Integer minStay;
    private Integer maxStay;
}
