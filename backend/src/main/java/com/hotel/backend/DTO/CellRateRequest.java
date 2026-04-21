package com.hotel.backend.DTO;

import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class CellRateRequest {
    private Long ratePlanId;
    private String date;
    private Double rate;
}
