package com.hotel.backend.Controllers;

import com.hotel.backend.Entity.Room;
import com.hotel.backend.Entity.RoomStatus;
import com.hotel.backend.Service.RoomService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/rooms")
@RequiredArgsConstructor
@CrossOrigin(origins="http://localhost:5173")


public class RoomController {
    private final RoomService roomService;

    @GetMapping
    public ResponseEntity<List<Room>> getAllRooms(){
        return ResponseEntity.ok(roomService.getAllRooms());
    }
    @PostMapping
    public ResponseEntity<Room> createRoom(@RequestBody Room room){
        return ResponseEntity.ok(roomService.createRoom(room));
    }
    @PutMapping("/{roomId}/status")
    public Room updateRoomStatus(@PathVariable Long roomId, @RequestParam RoomStatus roomStatus){
        return roomService.updateRoomStatus(roomId,roomStatus);
    }
}
