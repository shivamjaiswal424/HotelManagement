package com.hotel.backend.DTO;

import lombok.*;
import java.time.LocalDate;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ArrivalReportRow {
    private Long      reservationId;
    private String    guestName;
    private String    guestPhone;
    private String    guestEmail;
    private String    source;
    private String    mealPlan;
    private String    roomNo;
    private LocalDate checkIn;
    private LocalDate checkOut;
    private Integer   pax;
    private String    status;
    private Double    amount;
}
