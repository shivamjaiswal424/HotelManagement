package com.hotel.backend.Service;

import com.hotel.backend.Entity.Room;
import com.hotel.backend.Entity.RoomStatus;
import com.hotel.backend.Repository.RoomRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class RoomService {

    private final RoomRepository roomRepository;
    public List<Room> getAllRooms(){
        return roomRepository.findAll();
    }

    public Room createRoom(Room room){
        if(room.getRoomStatus()==null) room.setRoomStatus(RoomStatus.AVAILABLE);
        return roomRepository.save(room);
    }
    public Room updateRoomStatus(Long roomId, RoomStatus status) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new RuntimeException("Room not found"));
        room.setRoomStatus(status);
        return roomRepository.save(room);
    }

}
