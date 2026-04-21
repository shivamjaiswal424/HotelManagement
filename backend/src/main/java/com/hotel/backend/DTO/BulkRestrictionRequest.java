package com.hotel.backend.DTO;

import lombok.*;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class BulkRestrictionRequest {
    private String fromDate;
    private String toDate;
    private List<String> weekdays;
    private String restrictionType; // "RATE" or "INVENTORY"
    private List<RestrictionEntry> updates;

    @Getter @Setter
    public static class RestrictionEntry {
        private Long   ratePlanId;
        private String roomType;
        private Boolean stopSell;
        private Boolean closeOnArrival;
        private Boolean closeOnDeparture;
        private Integer minStay;
        private Integer maxStay;
    }
}
