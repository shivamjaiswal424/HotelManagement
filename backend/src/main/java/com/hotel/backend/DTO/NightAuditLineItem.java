package com.hotel.backend.DTO;

import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class NightAuditLineItem {
    private Long   reservationId;
    private String guestName;
    private String guestPhone;
    private String guestEmail;
    private String source;
    private String roomNumber;
    private String checkIn;
    private String checkOut;
    private int    pax;
    private String status;
    private double nightlyRate;
    private double serviceCharges;
    private double tax;
    private double totalAmount;
    private double totalPaid;
    private double balance;
}
