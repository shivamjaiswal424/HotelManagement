package com.hotel.backend.Entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

@Entity
@Table(name="inventory_calendar",
        uniqueConstraints=@UniqueConstraint(columnNames={"roomType","date"}))
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InventoryCalendar {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    private RoomType roomType;

    private LocalDate date;

    private Integer availableRooms;
}