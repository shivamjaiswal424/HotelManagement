package com.hotel.backend.DTO;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.util.List;
@Getter @Setter
public class RateBulkRequest {

    private List<Long> ratePlanIds;
    private LocalDate fromDate;
    private LocalDate toDate;
    private List<Integer> weekdays;
    private Double rateValue;
}

