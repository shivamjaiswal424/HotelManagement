package com.hotel.backend.DTO;

import lombok.*;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class BulkIncrementRequest {
    private String fromDate;
    private String toDate;
    private List<String> weekdays;
    private List<RatePlanIncrement> updates;

    @Getter @Setter
    public static class RatePlanIncrement {
        private Long ratePlanId;
        private Double increment;
    }
}
