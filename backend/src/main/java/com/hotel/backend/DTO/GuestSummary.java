package com.hotel.backend.DTO;

import lombok.*;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class GuestSummary {
    private String name;
    private String email;
    private String phone;
    private int    totalStays;
    private double totalValue;
    private String lastCheckIn;
    private String currentStatus;   // IN_HOUSE | UPCOMING | CHECKED_OUT
    private List<ReservationBrief> reservations;
}
