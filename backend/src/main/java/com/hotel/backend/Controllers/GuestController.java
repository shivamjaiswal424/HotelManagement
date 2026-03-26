package com.hotel.backend.Controllers;

import com.hotel.backend.Entity.Guest;
import com.hotel.backend.Repository.GuestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/guests")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class GuestController {

    private final GuestRepository guestRepository;

    @GetMapping
    public List<Guest> getAll(@RequestParam(required = false) String search) {
        if (search == null || search.isBlank()) return guestRepository.findAll();
        return guestRepository.findByNameContainingIgnoreCase(search);
    }

    @PostMapping
    public Guest create(@RequestBody Guest guest) {
        return guestRepository.save(guest);
    }
}
