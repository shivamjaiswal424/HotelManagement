package com.hotel.backend.DTO;

import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class CellInventoryRequest {
    private String roomType;
    private String date;
    private Integer availableRooms;
}
