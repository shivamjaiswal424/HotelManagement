package com.hotel.backend.DTO;

import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class DateWiseRow {
    private String date;
    private int    occupancyPercent;
    private int    occupied;
    private int    available;
    private double totalRevenue;
    private double arr;
    private double pmsRevenue;
    private double otaRevenue;
    private double walkInRevenue;
    private double phoneRevenue;
    private double emailRevenue;
    private double cgst6;
    private double sgst6;
    private double cgst9;
    private double sgst9;
}
