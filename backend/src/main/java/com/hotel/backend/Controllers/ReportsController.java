package com.hotel.backend.Controllers;


import com.hotel.backend.DTO.ArrivalReportRow;
import com.hotel.backend.DTO.SalesSummaryResponse;
import com.hotel.backend.Entity.Reservation;
import com.hotel.backend.Repository.ReservationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class ReportsController {

    private final ReservationRepository reservationRepository;

    @GetMapping("/arrival")
    public List<ArrivalReportRow> arrivalReport(@RequestParam String from,
                                                @RequestParam String to) {

        LocalDate fromDate = LocalDate.parse(from);
        LocalDate toDate = LocalDate.parse(to);

        // simple MVP filter: only checkInDate between
        return reservationRepository.findAll().stream()
                .filter(r -> r.getCheckInDate() != null)
                .filter(r -> !r.getCheckInDate().isBefore(fromDate) && !r.getCheckInDate().isAfter(toDate))
                .map(this::toArrivalRow)
                .toList();
    }

    private ArrivalReportRow toArrivalRow(Reservation r) {
        return ArrivalReportRow.builder()
                .reservationId(r.getId())
                .guestName(r.getGuestName())
                .source("PMS")
                .roomNo(r.getRoom() != null ? r.getRoom().getRoomNumber() : "-")
                .checkIn(r.getCheckInDate())
                .checkOut(r.getCheckOutDate())
                .pax(r.getGuestsCount())
                .status(r.getStatus() != null ? r.getStatus().name() : "UNKNOWN")
                .amount(r.getAmount())
                .build();
    }

    @GetMapping("/sales-summary")
    public SalesSummaryResponse salesSummary(@RequestParam String from,
                                             @RequestParam String to) {

        LocalDate fromDate = LocalDate.parse(from);
        LocalDate toDate = LocalDate.parse(to);

        List<Reservation> list = reservationRepository.findAll().stream()
                .filter(r -> r.getCheckInDate() != null)
                .filter(r -> !r.getCheckInDate().isBefore(fromDate) && !r.getCheckInDate().isAfter(toDate))
                .toList();

        double revenue = list.stream().mapToDouble(r -> r.getAmount() == null ? 0.0 : r.getAmount()).sum();
        long nightsSold = list.size(); // basic MVP

        double arr = list.isEmpty() ? 0.0 : revenue / list.size();

        return SalesSummaryResponse.builder()
                .roomNightsSold(nightsSold)
                .occupancyPercent(50) // placeholder for MVP
                .totalRevenue(revenue)
                .avgRoomRate(arr)
                .build();
    }
}

