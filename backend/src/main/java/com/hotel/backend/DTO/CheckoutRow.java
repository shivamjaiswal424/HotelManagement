package com.hotel.backend.DTO;

import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CheckoutRow {
    private Long   reservationId;
    private String guestName;
    private String guestPhone;
    private String roomNumber;
    private String roomType;
    private String source;
    private String mealPlan;
    private String paymentMode;
    private String checkIn;
    private String checkOut;
    private int    nights;
    private int    pax;
    private double roomCharges;
    private double serviceCharges;
    private double totalCharges;
    private double totalPaid;
    private double balance;
}
