package com.hotel.backend.DTO;

import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RoomStatusRow {
    private String roomNumber;
    private String roomType;
    private String roomStatus;
    private String currentGuest;
    private String guestPhone;
    private String checkIn;
    private String checkOut;
    private int    pax;
}
