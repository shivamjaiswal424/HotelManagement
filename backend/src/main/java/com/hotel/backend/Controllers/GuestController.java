package com.hotel.backend.Controllers;

import com.hotel.backend.DTO.GuestSummary;
import com.hotel.backend.DTO.ReservationBrief;
import com.hotel.backend.Entity.Guest;
import com.hotel.backend.Entity.Reservation;
import com.hotel.backend.Entity.ReservationStatus;
import com.hotel.backend.Repository.GuestRepository;
import com.hotel.backend.Repository.ReservationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/guests")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class GuestController {

    private final GuestRepository      guestRepository;
    private final ReservationRepository reservationRepository;

    // ── GET /api/guests — aggregated from reservations ────────────────────────
    @GetMapping
    public List<GuestSummary> getAll(@RequestParam(required = false) String search) {
        List<Reservation> all = reservationRepository.findAll();

        // Group by email (primary key) or normalised name as fallback
        Map<String, List<Reservation>> grouped = all.stream()
                .filter(r -> r.getGuestName() != null)
                .collect(Collectors.groupingBy(r ->
                        (r.getGuestEmail() != null && !r.getGuestEmail().isBlank())
                                ? r.getGuestEmail().toLowerCase().trim()
                                : r.getGuestName().toLowerCase().trim()));

        List<GuestSummary> summaries = grouped.values().stream()
                .map(this::buildSummary)
                .sorted(Comparator.comparingDouble(GuestSummary::getTotalValue).reversed())
                .collect(Collectors.toList());

        if (search != null && !search.isBlank()) {
            String q = search.toLowerCase();
            summaries = summaries.stream()
                    .filter(g -> (g.getName()  != null && g.getName().toLowerCase().contains(q))
                              || (g.getEmail() != null && g.getEmail().toLowerCase().contains(q))
                              || (g.getPhone() != null && g.getPhone().contains(q)))
                    .collect(Collectors.toList());
        }

        return summaries;
    }

    // ── POST /api/guests — manual guest profile (kept for compatibility) ──────
    @PostMapping
    public ResponseEntity<Guest> create(@RequestBody Guest guest) {
        return ResponseEntity.ok(guestRepository.save(guest));
    }

    // ── GET /api/guests/{email}/reservations — stay history by email/name ─────
    @GetMapping("/{identifier}/reservations")
    public List<Reservation> getReservations(@PathVariable String identifier) {
        String decoded = java.net.URLDecoder.decode(identifier, java.nio.charset.StandardCharsets.UTF_8);
        List<Reservation> byEmail = reservationRepository.findByGuestEmailIgnoreCase(decoded);
        if (!byEmail.isEmpty()) return byEmail;
        return reservationRepository.findAll().stream()
                .filter(r -> decoded.equalsIgnoreCase(r.getGuestName()))
                .collect(Collectors.toList());
    }

    // ── Private helpers ───────────────────────────────────────────────────────
    private GuestSummary buildSummary(List<Reservation> reservations) {
        Reservation rep = reservations.get(0);

        // Pick best contact info across all reservations
        String email = reservations.stream()
                .map(Reservation::getGuestEmail)
                .filter(e -> e != null && !e.isBlank())
                .findFirst().orElse(null);
        String phone = reservations.stream()
                .map(Reservation::getGuestPhone)
                .filter(p -> p != null && !p.isBlank())
                .findFirst().orElse(null);

        double totalValue = reservations.stream()
                .mapToDouble(r -> r.getAmount() != null ? r.getAmount() : 0).sum();

        String lastCheckIn = reservations.stream()
                .filter(r -> r.getCheckInDate() != null)
                .max(Comparator.comparing(Reservation::getCheckInDate))
                .map(r -> r.getCheckInDate().toString())
                .orElse(null);

        // Current status: IN_HOUSE beats UPCOMING beats CHECKED_OUT
        String currentStatus = "CHECKED_OUT";
        for (Reservation r : reservations) {
            if (r.getStatus() == ReservationStatus.CHECKED_IN) { currentStatus = "IN_HOUSE"; break; }
            if (r.getStatus() == ReservationStatus.BOOKED)     { currentStatus = "UPCOMING"; }
        }

        List<ReservationBrief> briefs = reservations.stream()
                .sorted(Comparator.comparing(r -> r.getCheckInDate() != null
                        ? r.getCheckInDate() : java.time.LocalDate.MIN, Comparator.reverseOrder()))
                .map(r -> {
                    int nights = (r.getCheckInDate() != null && r.getCheckOutDate() != null)
                            ? (int) ChronoUnit.DAYS.between(r.getCheckInDate(), r.getCheckOutDate()) : 0;
                    return ReservationBrief.builder()
                            .id(r.getId())
                            .roomNumber(r.getRoom() != null ? r.getRoom().getRoomNumber() : "—")
                            .roomType(r.getRoom() != null ? r.getRoom().getRoomType().name() : "—")
                            .checkInDate(r.getCheckInDate() != null ? r.getCheckInDate().toString() : "—")
                            .checkOutDate(r.getCheckOutDate() != null ? r.getCheckOutDate().toString() : "—")
                            .nights(nights)
                            .pax(r.getGuestsCount() != null ? r.getGuestsCount() : 1)
                            .status(r.getStatus() != null ? r.getStatus().name() : "UNKNOWN")
                            .mealPlan(r.getMealPlan() != null ? r.getMealPlan().name() : null)
                            .source(r.getSource() != null ? r.getSource().name() : null)
                            .paymentMode(r.getPaymentMode() != null ? r.getPaymentMode().name() : null)
                            .amount(r.getAmount() != null ? r.getAmount() : 0)
                            .build();
                }).collect(Collectors.toList());

        return GuestSummary.builder()
                .name(rep.getGuestName())
                .email(email)
                .phone(phone)
                .totalStays(reservations.size())
                .totalValue(totalValue)
                .lastCheckIn(lastCheckIn)
                .currentStatus(currentStatus)
                .reservations(briefs)
                .build();
    }
}
