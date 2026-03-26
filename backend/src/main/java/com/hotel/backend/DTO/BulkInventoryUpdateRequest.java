package com.hotel.backend.DTO;

import lombok.*;

import java.util.List;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class BulkInventoryUpdateRequest {
    private String fromDate;
    private String toDate;
    private List<String> weekdays;

    private List<RoomTypeInventory> updates;

    @Getter @Setter
    public static class RoomTypeInventory {
        private String roomType;
        private Integer value;
    }
}
