package com.hotel.backend.DTO;

import lombok.*;
import java.time.LocalDate;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class NightAuditResponse {
    private LocalDate date;
    private int    totalRooms;
    private int    occupied;
    private int    arrivals;
    private int    departures;
    private int    occupancyPercent;
    private double revenue;
    private List<NightAuditLineItem> lineItems;
}
