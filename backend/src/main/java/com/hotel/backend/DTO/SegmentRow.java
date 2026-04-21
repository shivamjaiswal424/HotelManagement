package com.hotel.backend.DTO;

import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SegmentRow {
    private String label;
    private double revenue;
    private long   roomNights;
    private double arr;
}
