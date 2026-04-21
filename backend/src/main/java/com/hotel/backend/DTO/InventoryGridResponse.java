package com.hotel.backend.DTO;

import lombok.*;
import java.util.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class InventoryGridResponse {
    private List<String> dates;
    private List<RoomTypeRow> roomTypes;
    private List<TotalRow> totals;

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class RoomTypeRow {
        private String type;
        private String label;
        private int totalCount;
        private Map<String, Integer> inventory;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class TotalRow {
        private String date;
        private int available;
        private int total;
        private double occupancyPct;
    }
}
