package com.hotel.backend.Repository;

import com.hotel.backend.Entity.Room;
import com.hotel.backend.Entity.RoomStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RoomRepository extends JpaRepository<Room, Long> {
    Optional<Room> findRoomByRoomNumber(String roomNumber);
    List<Room> findByRoomStatus(RoomStatus roomStatus);

}
