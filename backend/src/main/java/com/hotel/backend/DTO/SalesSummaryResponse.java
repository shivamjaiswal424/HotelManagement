package com.hotel.backend.DTO;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SalesSummaryResponse {
    private Long roomNightsSold;
    private Integer occupancyPercent;
    private Double totalRevenue;
    private Double avgRoomRate;
}
