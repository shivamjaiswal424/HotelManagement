package com.hotel.backend.Repository;

import com.hotel.backend.Entity.InventoryCalendar;
import com.hotel.backend.Entity.RoomType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface InventoryCalendarRepository extends JpaRepository<InventoryCalendar, Long> {

    List<InventoryCalendar> findByDateBetween(LocalDate from, LocalDate to);

    Optional<InventoryCalendar> findByRoomTypeAndDate(RoomType roomType, LocalDate date);
}

