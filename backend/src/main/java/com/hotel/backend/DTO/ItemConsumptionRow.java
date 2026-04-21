package com.hotel.backend.DTO;

import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ItemConsumptionRow {
    private String description;
    private String guestName;
    private String roomNumber;
    private String date;
    private double amount;
}
