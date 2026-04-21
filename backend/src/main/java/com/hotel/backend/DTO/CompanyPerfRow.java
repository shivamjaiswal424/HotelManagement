package com.hotel.backend.DTO;

import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CompanyPerfRow {
    private String source;
    private long   reservationCount;
    private long   roomNights;
    private double revenue;
    private double arr;
    private double totalPaid;
    private double outstanding;
}
