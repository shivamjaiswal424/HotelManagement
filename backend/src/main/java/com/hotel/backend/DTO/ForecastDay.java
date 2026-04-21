package com.hotel.backend.DTO;

import lombok.*;
import java.time.LocalDate;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ForecastDay {
    private LocalDate date;
    private long  arrivals;
    private long  departures;
    private long  stayOvers;
    private long  occupied;
    private long  available;
    private int   occupancyPercent;
    private double revenue;
    private double arr;
    private double pmsRevenue;
    private double otaRevenue;
    private double walkInRevenue;
    private double phoneRevenue;
    private double emailRevenue;
}
