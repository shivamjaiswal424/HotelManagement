package com.hotel.backend.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class MonthlyStats {
    private String month;
    private Long reservations;
    private Double revenue;
    private Double occupancyPercent;
    private Double avgRate;
}
