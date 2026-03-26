package com.hotel.backend.DTO;


import lombok.*;
import java.util.List;
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class BulkRateUpdateRequest {
    private String fromDate;
    private String toDate;

    // selected weekdays: ["MON","TUE"...]
    private List<String> weekdays;

    private List<RatePlanRate> updates;

    @Getter @Setter
    public static class RatePlanRate {
        private Long ratePlanId;
        private Double value;
    }
}