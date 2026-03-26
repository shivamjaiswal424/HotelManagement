package com.hotel.backend.DTO;

import com.hotel.backend.Entity.RoomType;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.util.List;

@Getter
@Setter
public class InventoryBulkRequest {

    private List<RoomType> roomTypes;
    private LocalDate fromDate;
    private LocalDate toDate;
    private List<Integer> weekdays;
    private Integer inventoryValue;
}
