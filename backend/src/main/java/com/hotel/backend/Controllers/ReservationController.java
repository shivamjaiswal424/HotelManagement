package com.hotel.backend.Controllers;

import com.hotel.backend.DTO.InvoiceResponse;
import com.hotel.backend.DTO.StayViewEntry;
import com.hotel.backend.Entity.Payment;
import com.hotel.backend.Entity.Reservation;
import com.hotel.backend.Entity.ServiceCharge;
import com.hotel.backend.Repository.ReservationRepository;
import com.hotel.backend.Service.ReservationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/reservations")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class ReservationController {
    private final ReservationService reservationService;
    private final ReservationRepository reservationRepository;

    @GetMapping
    public List<Reservation> getAllReservations() {
        return reservationService.getAllReservations();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Reservation> getById(@PathVariable Long id) {
        return reservationRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/by-room/{roomId}/active")
    public ResponseEntity<Reservation> getActiveByRoom(@PathVariable Long roomId) {
        return reservationService.getActiveByRoom(roomId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public Reservation createReservation(@RequestBody Reservation reservation, @RequestParam Long roomId) {
        return reservationService.createReservation(reservation, roomId);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateReservation(@PathVariable Long id, @RequestBody Reservation updates) {
        try {
            return ResponseEntity.ok(reservationService.updateReservation(id, updates));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/{id}/checkin")
    public ResponseEntity<?> checkIn(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(reservationService.checkIn(id));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/{id}/checkout")
    public ResponseEntity<?> checkOut(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(reservationService.checkOut(id));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/{id}/services")
    public List<ServiceCharge> getServices(@PathVariable Long id) {
        return reservationService.getServiceCharges(id);
    }

    @PostMapping("/{id}/services")
    public ResponseEntity<?> addService(@PathVariable Long id, @RequestBody ServiceCharge charge) {
        try {
            return ResponseEntity.ok(reservationService.addServiceCharge(id, charge));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/{id}/payments")
    public List<Payment> getPayments(@PathVariable Long id) {
        return reservationService.getPayments(id);
    }

    @PostMapping("/{id}/payments")
    public ResponseEntity<?> addPayment(@PathVariable Long id, @RequestBody Payment payment) {
        try {
            return ResponseEntity.ok(reservationService.addPayment(id, payment));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/{id}/invoice")
    public ResponseEntity<?> getInvoice(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(reservationService.getInvoice(id));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/{id}/exchange")
    public ResponseEntity<?> exchangeRoom(@PathVariable Long id, @RequestParam Long newRoomId) {
        try {
            return ResponseEntity.ok(reservationService.exchangeRoom(id, newRoomId));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
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
