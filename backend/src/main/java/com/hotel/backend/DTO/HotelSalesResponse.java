package com.hotel.backend.DTO;

import lombok.*;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class HotelSalesResponse {
    private long   roomNightsSold;
    private int    occupancyPercent;
    private double arr;
    private double totalRevenue;
    private double roomRevenue;
    private double serviceRevenue;
    private List<SegmentRow> mealPlanBreakdown;
    private List<SegmentRow> sourceBreakdown;
}
