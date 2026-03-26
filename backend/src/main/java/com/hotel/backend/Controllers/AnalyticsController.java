package com.hotel.backend.Controllers;

import com.hotel.backend.DTO.MonthlyStats;
import com.hotel.backend.Entity.Reservation;
import com.hotel.backend.Repository.ReservationRepository;
import com.hotel.backend.Repository.RoomRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/analytics")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class AnalyticsController {

    private final ReservationRepository reservationRepository;
    private final RoomRepository roomRepository;

    @GetMapping("/monthly")
    public ResponseEntity<List<MonthlyStats>> getMonthlyStats(
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to) {

        LocalDate toDate   = to   != null ? LocalDate.parse(to)   : LocalDate.now();
        LocalDate fromDate = from != null ? LocalDate.parse(from) : toDate.minusMonths(5).withDayOfMonth(1);

        List<Reservation> reservations = reservationRepository.findByCheckInDateBetween(fromDate, toDate);
        long totalRooms = Math.max(1, roomRepository.count());

        Map<YearMonth, List<Reservation>> byMonth = reservations.stream()
                .collect(Collectors.groupingBy(r -> YearMonth.from(r.getCheckInDate())));

        // Build list of months in range
        List<YearMonth> months = new ArrayList<>();
        YearMonth cur = YearMonth.from(fromDate);
        YearMonth end = YearMonth.from(toDate);
        while (!cur.isAfter(end)) { months.add(cur); cur = cur.plusMonths(1); }

        List<MonthlyStats> stats = months.stream().map(ym -> {
            List<Reservation> monthRes = byMonth.getOrDefault(ym, List.of());
            long nights = monthRes.stream()
                    .mapToLong(r -> Math.max(0, r.getCheckInDate().until(r.getCheckOutDate(), ChronoUnit.DAYS)))
                    .sum();
            double revenue = monthRes.stream()
                    .mapToDouble(r -> r.getAmount() != null ? r.getAmount() : 0).sum();
            double occupancy = (nights * 100.0) / (totalRooms * ym.lengthOfMonth());
            double avgRate   = nights > 0 ? revenue / nights : 0;
            return MonthlyStats.builder()
                    .month(ym.toString())
                    .reservations((long) monthRes.size())
                    .revenue(Math.round(revenue * 100.0) / 100.0)
                    .occupancyPercent(Math.round(occupancy * 10.0) / 10.0)
                    .avgRate(Math.round(avgRate * 10.0) / 10.0)
                    .build();
        }).collect(Collectors.toList());

        return ResponseEntity.ok(stats);
    }
}
