package com.hotel.backend.Repository;

import com.hotel.backend.Entity.InventoryRestriction;
import com.hotel.backend.Entity.RoomType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.Optional;

public interface InventoryRestrictionRepository extends JpaRepository<InventoryRestriction, Long> {
    Optional<InventoryRestriction> findByRoomTypeAndDate(RoomType roomType, LocalDate date);
}
