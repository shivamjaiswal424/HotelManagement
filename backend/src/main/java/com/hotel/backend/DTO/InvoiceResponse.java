package com.hotel.backend.DTO;

import com.hotel.backend.Entity.Payment;
import com.hotel.backend.Entity.ServiceCharge;
import lombok.*;
import java.time.LocalDate;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class InvoiceResponse {
    private Long reservationId;
    private String guestName;
    private String guestEmail;
    private String guestPhone;
    private String roomNumber;
    private String roomType;
    private LocalDate checkInDate;
    private LocalDate checkOutDate;
    private int nights;
    private int guestsCount;
    private String mealPlan;
    private String source;
    private String paymentMode;
    private double roomCharges;
    private List<ServiceCharge> services;
    private List<Payment> payments;
    private double totalCharges;
    private double totalPaid;
    private double balance;
}
