package com.hotel.backend.DTO;

import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PaymentRow {
    private Long   paymentId;
    private Long   reservationId;
    private String guestName;
    private String roomNumber;
    private String paymentDate;
    private double amount;
    private String paymentMode;
    private String remarks;
}
