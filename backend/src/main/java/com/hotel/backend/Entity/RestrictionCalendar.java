package com.hotel.backend.Entity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;


@Entity
@Table(
        name = "restriction_calendar",
        uniqueConstraints = @UniqueConstraint(columnNames = {"scope", "scopeKey", "date"})
)
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class RestrictionCalendar {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // RATEPLAN or ROOMTYPE
    private String scope;

    // if RATEPLAN -> ratePlanId, if ROOMTYPE -> roomType
    private String scopeKey;

    private LocalDate date;

    private Boolean stopSell;
    private Boolean closeOnArrival;
    private Boolean closeOnDeparture;

    private Integer minStay;
    private Integer minStayArrival;
    private Integer maxStay;
    private Integer maxStayArrival;

    private Boolean exactStayArrival;

    private Integer minAdvanceReservation;
    private Integer maxAdvanceReservation;
}