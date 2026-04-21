package com.hotel.backend.DTO;

import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ReservationBrief {
    private Long   id;
    private String roomNumber;
    private String roomType;
    private String checkInDate;
    private String checkOutDate;
    private int    nights;
    private int    pax;
    private String status;
    private String mealPlan;
    private String source;
    private String paymentMode;
    private double amount;
}
