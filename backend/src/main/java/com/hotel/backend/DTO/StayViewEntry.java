package com.hotel.backend.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class StayViewEntry {
    private Long reservationId;
    private String guestName;
    private String guestPhone;
    private String roomNumber;
    private String roomType;
    private String checkIn;
    private String checkOut;
    private String status;
    private Double amount;
    private Integer guestsCount;
}
