package com.hotel.backend.DTO;

import lombok.*;
import java.util.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RatesGridResponse {
    private List<String> dates;
    private List<RatePlanRow> ratePlans;
    private List<DateStat> dateStats;

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class RatePlanRow {
        private Long id;
        private String name;
        private String roomType;
        private String mealPlan;
        private String category;
        private Map<String, Double> rates;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class DateStat {
        private String date;
        private int occupied;
        private int totalRooms;
        private double occupancyPct;
        private Double recommendedRate;
    }
}
