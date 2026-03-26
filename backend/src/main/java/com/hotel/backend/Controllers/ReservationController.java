package com.hotel.backend.Controllers;

import com.hotel.backend.DTO.StayViewEntry;
import com.hotel.backend.Entity.Reservation;
import com.hotel.backend.Repository.ReservationRepository;
import com.hotel.backend.Service.ReservationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/reservations")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class ReservationController {
    private final ReservationService reservationService;
    private final ReservationRepository reservationRepository;

    @GetMapping
    public List<Reservation> getAllReservations(){
        return reservationService.getAllReservations();
    }

    @PostMapping
    public Reservation createReservation(@RequestBody Reservation reservation, @RequestParam Long roomId){
        return reservationService.createReservation(reservation, roomId);
    }

    @PutMapping("/{id}/checkin")
    public ResponseEntity<?> checkIn(@PathVariable Long id){
        try {
            return ResponseEntity.ok(reservationService.checkIn(id));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(java.util.Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/{id}/checkout")
    public Reservation checkOut(@PathVariable Long id){
        return reservationService.checkOut(id);
    }

    @GetMapping("/stay-view")
    public ResponseEntity<List<StayViewEntry>> getStayView(
            @RequestParam String from,
            @RequestParam String to) {
        LocalDate fromDate = LocalDate.parse(from);
        LocalDate toDate   = LocalDate.parse(to);
        List<Reservation> reservations = reservationRepository
                .findByCheckInDateLessThanEqualAndCheckOutDateGreaterThan(toDate, fromDate);
        List<StayViewEntry> result = reservations.stream()
                .filter(r -> r.getRoom() != null)
                .map(r -> StayViewEntry.builder()
                        .reservationId(r.getId())
                        .guestName(r.getGuestName())
                        .guestPhone(r.getGuestPhone())
                        .roomNumber(r.getRoom().getRoomNumber())
                        .roomType(r.getRoom().getRoomType().name())
                        .checkIn(r.getCheckInDate().toString())
                        .checkOut(r.getCheckOutDate().toString())
                        .status(r.getStatus().name())
                        .amount(r.getAmount())
                        .guestsCount(r.getGuestsCount())
                        .build())
                .collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }
}
