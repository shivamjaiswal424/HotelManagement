package com.hotel.backend.DTO;

import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RoomWiseRow {
    private String roomNumber;
    private String roomType;
    private int nightsSold;
    private double revenue;
}
