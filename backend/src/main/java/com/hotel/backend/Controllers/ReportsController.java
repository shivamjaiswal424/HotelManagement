package com.hotel.backend.Controllers;

import com.hotel.backend.DTO.*;
import com.hotel.backend.Entity.*;
import com.hotel.backend.Repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class ReportsController {

    private final ReservationRepository   reservationRepository;
    private final RoomRepository          roomRepository;
    private final ServiceChargeRepository serviceChargeRepository;
    private final PaymentRepository       paymentRepository;

    // ── Arrival Report ────────────────────────────────────────────────────────
    @GetMapping("/arrival")
    public List<ArrivalReportRow> arrivalReport(@RequestParam String from, @RequestParam String to) {
        return reservationRepository
                .findByCheckInDateBetween(LocalDate.parse(from), LocalDate.parse(to))
                .stream().map(this::toRow).toList();
    }

    // ── Departure Report ──────────────────────────────────────────────────────
    @GetMapping("/departure")
    public List<ArrivalReportRow> departureReport(@RequestParam String from, @RequestParam String to) {
        return reservationRepository
                .findByCheckOutDateBetween(LocalDate.parse(from), LocalDate.parse(to))
                .stream().map(this::toRow).toList();
    }

    // ── Night Audit (summary + in-house guest line items) ─────────────────────
    @GetMapping("/night-audit")
    public NightAuditResponse nightAudit(@RequestParam String date) {
        LocalDate d    = LocalDate.parse(date);
        int totalRooms = (int) roomRepository.count();
        int arrivals   = reservationRepository.findByCheckInDate(d).size();
        int departures = reservationRepository.findByCheckOutDate(d).size();

        List<Reservation> inHouse = reservationRepository.findAll().stream()
                .filter(r -> r.getCheckInDate() != null && r.getCheckOutDate() != null)
                .filter(r -> !r.getCheckInDate().isAfter(d) && r.getCheckOutDate().isAfter(d))
                .filter(r -> r.getStatus() == ReservationStatus.CHECKED_IN
                          || r.getStatus() == ReservationStatus.BOOKED)
                .toList();

        int occ = totalRooms > 0
                ? (int) Math.min(100, Math.round(inHouse.size() * 100.0 / totalRooms)) : 0;

        List<NightAuditLineItem> lines = inHouse.stream().map(r -> {
            long nights    = ChronoUnit.DAYS.between(r.getCheckInDate(), r.getCheckOutDate());
            double nightly = (r.getAmount() != null && nights > 0) ? r.getAmount() / nights : 0;
            double svc     = svcTotal(r.getId());
            double paid    = paidTotal(r.getId());
            double taxRate = nightly >= 7500 ? 0.18 : nightly >= 1000 ? 0.12 : 0.0;
            double tax     = round2(nightly * taxRate);
            double total   = round2(nightly + tax + svc);
            return NightAuditLineItem.builder()
                    .reservationId(r.getId())
                    .guestName(r.getGuestName()).guestPhone(r.getGuestPhone()).guestEmail(r.getGuestEmail())
                    .source(sourceName(r.getSource()))
                    .roomNumber(r.getRoom() != null ? r.getRoom().getRoomNumber() : "—")
                    .checkIn(r.getCheckInDate().toString()).checkOut(r.getCheckOutDate().toString())
                    .pax(r.getGuestsCount() != null ? r.getGuestsCount() : 1)
                    .status(r.getStatus().name())
                    .nightlyRate(round2(nightly)).serviceCharges(round2(svc))
                    .tax(tax).totalAmount(total).totalPaid(round2(paid)).balance(round2(total - paid))
                    .build();
        }).toList();

        double revenue = lines.stream().mapToDouble(NightAuditLineItem::getNightlyRate).sum();
        return NightAuditResponse.builder()
                .date(d).totalRooms(totalRooms).occupied(inHouse.size())
                .arrivals(arrivals).departures(departures)
                .occupancyPercent(occ).revenue(round2(revenue)).lineItems(lines)
                .build();
    }

    // ── Police Enquiry / Guest Register ──────────────────────────────────────
    @GetMapping("/police-enquiry")
    public List<ArrivalReportRow> policeEnquiry(@RequestParam String from, @RequestParam String to) {
        LocalDate f = LocalDate.parse(from), t = LocalDate.parse(to);
        return reservationRepository.findAll().stream()
                .filter(r -> r.getCheckInDate() != null && r.getCheckOutDate() != null)
                .filter(r -> !r.getCheckInDate().isAfter(t) && r.getCheckOutDate().isAfter(f))
                .map(this::toRow).toList();
    }

    // ── Management Block Report (upcoming BOOKED reservations) ────────────────
    @GetMapping("/mgmt-block")
    public List<ArrivalReportRow> mgmtBlock(@RequestParam String from, @RequestParam String to) {
        LocalDate f = LocalDate.parse(from), t = LocalDate.parse(to);
        return reservationRepository.findAll().stream()
                .filter(r -> r.getStatus() == ReservationStatus.BOOKED)
                .filter(r -> r.getCheckInDate() != null
                          && !r.getCheckInDate().isBefore(f)
                          && !r.getCheckInDate().isAfter(t))
                .map(this::toRow).toList();
    }

    // ── Daily Forecast Report (date range) ───────────────────────────────────
    @GetMapping("/forecast")
    public List<ForecastDay> forecast(@RequestParam(required = false) String from,
                                      @RequestParam(required = false) String to) {
        LocalDate start = from != null ? LocalDate.parse(from) : LocalDate.now();
        LocalDate end   = to   != null ? LocalDate.parse(to)   : start.plusDays(6);
        int totalRooms  = (int) roomRepository.count();
        List<Reservation> all = reservationRepository.findAll();
        List<ForecastDay> result = new ArrayList<>();

        for (LocalDate d = start; !d.isAfter(end); d = d.plusDays(1)) {
            final LocalDate day = d;
            List<Reservation> inHouse = all.stream()
                    .filter(r -> r.getCheckInDate() != null && r.getCheckOutDate() != null)
                    .filter(r -> !r.getCheckInDate().isAfter(day) && r.getCheckOutDate().isAfter(day))
                    .toList();

            long arrivals   = all.stream().filter(r -> day.equals(r.getCheckInDate())).count();
            long departures = all.stream().filter(r -> day.equals(r.getCheckOutDate())).count();
            long stayOvers  = inHouse.stream()
                    .filter(r -> r.getCheckInDate().isBefore(day) && r.getStatus() == ReservationStatus.CHECKED_IN)
                    .count();
            long occupied   = inHouse.size();
            int  occPct     = totalRooms > 0 ? (int) Math.min(100, Math.round(occupied * 100.0 / totalRooms)) : 0;
            double rev      = nightlyRevenue(inHouse);

            result.add(ForecastDay.builder()
                    .date(day).arrivals(arrivals).departures(departures).stayOvers(stayOvers)
                    .occupied(occupied).available((long)(totalRooms - occupied))
                    .occupancyPercent(occPct).revenue(round2(rev))
                    .arr(occupied > 0 ? round2(rev / occupied) : 0)
                    .pmsRevenue(round2(srcRev(inHouse, BookingSource.PMS)))
                    .otaRevenue(round2(srcRev(inHouse, BookingSource.OTA)))
                    .walkInRevenue(round2(srcRev(inHouse, BookingSource.WALK_IN)))
                    .phoneRevenue(round2(srcRev(inHouse, BookingSource.PHONE)))
                    .emailRevenue(round2(srcRev(inHouse, BookingSource.EMAIL)))
                    .build());
        }
        return result;
    }

    // ── Room Status Report ────────────────────────────────────────────────────
    @GetMapping("/room-status")
    public List<RoomStatusRow> roomStatus() {
        List<Reservation> active = reservationRepository.findAll().stream()
                .filter(r -> r.getStatus() == ReservationStatus.CHECKED_IN
                          || r.getStatus() == ReservationStatus.BOOKED)
                .toList();
        Map<Long, Reservation> roomToRes = new HashMap<>();
        for (Reservation r : active) {
            if (r.getRoom() != null) roomToRes.put(r.getRoom().getId(), r);
        }
        return roomRepository.findAll().stream()
                .sorted(Comparator.comparing(Room::getRoomNumber))
                .map(room -> {
                    Reservation res = roomToRes.get(room.getId());
                    return RoomStatusRow.builder()
                            .roomNumber(room.getRoomNumber()).roomType(room.getRoomType().name())
                            .roomStatus(room.getRoomStatus().name())
                            .currentGuest(res != null ? res.getGuestName() : null)
                            .guestPhone(res != null ? res.getGuestPhone() : null)
                            .checkIn(res != null && res.getCheckInDate() != null ? res.getCheckInDate().toString() : null)
                            .checkOut(res != null && res.getCheckOutDate() != null ? res.getCheckOutDate().toString() : null)
                            .pax(res != null && res.getGuestsCount() != null ? res.getGuestsCount() : 0)
                            .build();
                }).toList();
    }

    // ── Out of Order / Maintenance Rooms ─────────────────────────────────────
    @GetMapping("/oo-rooms")
    public List<RoomStatusRow> ooRooms() {
        return roomRepository.findAll().stream()
                .filter(r -> r.getRoomStatus() == RoomStatus.OUT_OF_ORDER
                          || r.getRoomStatus() == RoomStatus.MAINTENANCE)
                .sorted(Comparator.comparing(Room::getRoomNumber))
                .map(r -> RoomStatusRow.builder()
                        .roomNumber(r.getRoomNumber()).roomType(r.getRoomType().name())
                        .roomStatus(r.getRoomStatus().name())
                        .build())
                .toList();
    }

    // ── No Show Report ────────────────────────────────────────────────────────
    @GetMapping("/no-show")
    public List<ArrivalReportRow> noShow(@RequestParam String from, @RequestParam String to) {
        LocalDate f = LocalDate.parse(from), t = LocalDate.parse(to);
        LocalDate today = LocalDate.now();
        return reservationRepository.findAll().stream()
                .filter(r -> r.getStatus() == ReservationStatus.BOOKED)
                .filter(r -> r.getCheckInDate() != null
                          && !r.getCheckInDate().isBefore(f)
                          && !r.getCheckInDate().isAfter(t)
                          && r.getCheckInDate().isBefore(today))
                .map(this::toRow).toList();
    }

    // ── Date Wise Revenue / Monthly Performance ───────────────────────────────
    @GetMapping("/date-wise")
    public List<DateWiseRow> dateWise(@RequestParam String from, @RequestParam String to) {
        LocalDate start = LocalDate.parse(from), end = LocalDate.parse(to);
        int totalRooms  = (int) roomRepository.count();
        List<Reservation> all = reservationRepository.findAll();
        List<DateWiseRow> result = new ArrayList<>();

        for (LocalDate d = start; !d.isAfter(end); d = d.plusDays(1)) {
            final LocalDate day = d;
            List<Reservation> inHouse = all.stream()
                    .filter(r -> r.getCheckInDate() != null && r.getCheckOutDate() != null)
                    .filter(r -> !r.getCheckInDate().isAfter(day) && r.getCheckOutDate().isAfter(day))
                    .toList();

            int occ    = totalRooms > 0 ? (int) Math.min(100, Math.round(inHouse.size() * 100.0 / totalRooms)) : 0;
            double rev = nightlyRevenue(inHouse);
            double cgst6 = 0, sgst6 = 0, cgst9 = 0, sgst9 = 0;
            for (Reservation r : inHouse) {
                long n   = ChronoUnit.DAYS.between(r.getCheckInDate(), r.getCheckOutDate());
                double nr = n > 0 && r.getAmount() != null ? r.getAmount() / n : 0;
                if (nr >= 7500)      { cgst9 += nr * 0.09; sgst9 += nr * 0.09; }
                else if (nr >= 1000) { cgst6 += nr * 0.06; sgst6 += nr * 0.06; }
            }
            result.add(DateWiseRow.builder()
                    .date(day.toString())
                    .occupancyPercent(occ).occupied(inHouse.size()).available(totalRooms - inHouse.size())
                    .totalRevenue(round2(rev)).arr(inHouse.isEmpty() ? 0 : round2(rev / inHouse.size()))
                    .pmsRevenue(round2(srcRev(inHouse, BookingSource.PMS)))
                    .otaRevenue(round2(srcRev(inHouse, BookingSource.OTA)))
                    .walkInRevenue(round2(srcRev(inHouse, BookingSource.WALK_IN)))
                    .phoneRevenue(round2(srcRev(inHouse, BookingSource.PHONE)))
                    .emailRevenue(round2(srcRev(inHouse, BookingSource.EMAIL)))
                    .cgst6(round2(cgst6)).sgst6(round2(sgst6)).cgst9(round2(cgst9)).sgst9(round2(sgst9))
                    .build());
        }
        return result;
    }

    // ── Room Wise Revenue ─────────────────────────────────────────────────────
    @GetMapping("/room-wise")
    public List<RoomWiseRow> roomWise(@RequestParam String from, @RequestParam String to) {
        LocalDate fromDate = LocalDate.parse(from), toDate = LocalDate.parse(to);
        Map<String, List<Reservation>> byRoom = reservationRepository.findAll().stream()
                .filter(r -> r.getRoom() != null && r.getCheckInDate() != null)
                .filter(r -> !r.getCheckInDate().isBefore(fromDate) && !r.getCheckInDate().isAfter(toDate))
                .collect(Collectors.groupingBy(r -> r.getRoom().getRoomNumber()));
        return byRoom.entrySet().stream().map(e -> {
            int nights = e.getValue().stream().mapToInt(r -> r.getCheckOutDate() != null
                    ? (int) ChronoUnit.DAYS.between(r.getCheckInDate(), r.getCheckOutDate()) : 0).sum();
            double rev = e.getValue().stream().mapToDouble(r -> r.getAmount() == null ? 0 : r.getAmount()).sum();
            return RoomWiseRow.builder()
                    .roomNumber(e.getKey()).roomType(e.getValue().get(0).getRoom().getRoomType().name())
                    .nightsSold(nights).revenue(rev).build();
        }).sorted((a, b) -> Double.compare(b.getRevenue(), a.getRevenue())).toList();
    }

    // ── Checkout Based Accounting ─────────────────────────────────────────────
    @GetMapping("/checkout-accounting")
    public List<CheckoutRow> checkoutAccounting(@RequestParam String from, @RequestParam String to) {
        return reservationRepository
                .findByStatusAndCheckOutDateBetween(ReservationStatus.CHECKED_OUT,
                        LocalDate.parse(from), LocalDate.parse(to))
                .stream().map(r -> {
                    long nights  = r.getCheckInDate() != null && r.getCheckOutDate() != null
                            ? ChronoUnit.DAYS.between(r.getCheckInDate(), r.getCheckOutDate()) : 0;
                    double svc   = svcTotal(r.getId());
                    double paid  = paidTotal(r.getId());
                    double room  = r.getAmount() != null ? r.getAmount() : 0;
                    double total = room + svc;
                    return CheckoutRow.builder()
                            .reservationId(r.getId())
                            .guestName(r.getGuestName()).guestPhone(r.getGuestPhone())
                            .roomNumber(r.getRoom() != null ? r.getRoom().getRoomNumber() : "—")
                            .roomType(r.getRoom() != null ? r.getRoom().getRoomType().name() : "—")
                            .source(sourceName(r.getSource()))
                            .mealPlan(r.getMealPlan() != null ? r.getMealPlan().name() : "—")
                            .paymentMode(r.getPaymentMode() != null ? r.getPaymentMode().name() : "—")
                            .checkIn(r.getCheckInDate() != null ? r.getCheckInDate().toString() : "—")
                            .checkOut(r.getCheckOutDate() != null ? r.getCheckOutDate().toString() : "—")
                            .nights((int) nights).pax(r.getGuestsCount() != null ? r.getGuestsCount() : 1)
                            .roomCharges(round2(room)).serviceCharges(round2(svc))
                            .totalCharges(round2(total)).totalPaid(round2(paid)).balance(round2(total - paid))
                            .build();
                }).toList();
    }

    // ── Item Consumption / POS / Expense Report ───────────────────────────────
    @GetMapping("/item-consumption")
    public List<ItemConsumptionRow> itemConsumption(@RequestParam String from, @RequestParam String to) {
        LocalDate f = LocalDate.parse(from), t = LocalDate.parse(to);
        return serviceChargeRepository.findAll().stream()
                .filter(sc -> sc.getChargeDate() != null
                           && !sc.getChargeDate().isBefore(f)
                           && !sc.getChargeDate().isAfter(t))
                .sorted(Comparator.comparing(ServiceCharge::getChargeDate))
                .map(sc -> {
                    Reservation r = sc.getReservation();
                    return ItemConsumptionRow.builder()
                            .description(sc.getDescription())
                            .guestName(r != null ? r.getGuestName() : "—")
                            .roomNumber(r != null && r.getRoom() != null ? r.getRoom().getRoomNumber() : "—")
                            .date(sc.getChargeDate().toString())
                            .amount(sc.getAmount())
                            .build();
                }).toList();
    }

    // ── Payments Report ───────────────────────────────────────────────────────
    @GetMapping("/payments-report")
    public List<PaymentRow> paymentsReport(@RequestParam String from, @RequestParam String to) {
        LocalDate f = LocalDate.parse(from), t = LocalDate.parse(to);
        return paymentRepository.findAll().stream()
                .filter(p -> p.getPaymentDate() != null
                          && !p.getPaymentDate().isBefore(f)
                          && !p.getPaymentDate().isAfter(t))
                .sorted(Comparator.comparing(Payment::getPaymentDate))
                .map(p -> toPaymentRow(p)).toList();
    }

    // ── Payment Void Report (no void concept — returns empty) ─────────────────
    @GetMapping("/payment-void")
    public List<PaymentRow> paymentVoid(@RequestParam String from, @RequestParam String to) {
        return new ArrayList<>();
    }

    // ── City Ledger Payment Report (BANK_TRANSFER / CREDIT) ──────────────────
    @GetMapping("/city-ledger")
    public List<PaymentRow> cityLedger(@RequestParam String from, @RequestParam String to) {
        LocalDate f = LocalDate.parse(from), t = LocalDate.parse(to);
        return paymentRepository.findAll().stream()
                .filter(p -> p.getPaymentDate() != null
                          && !p.getPaymentDate().isBefore(f)
                          && !p.getPaymentDate().isAfter(t))
                .filter(p -> p.getPaymentMode() == PaymentMode.BANK_TRANSFER
                          || p.getPaymentMode() == PaymentMode.CREDIT)
                .sorted(Comparator.comparing(Payment::getPaymentDate))
                .map(p -> toPaymentRow(p)).toList();
    }

    // ── Hotel Sales Report ────────────────────────────────────────────────────
    @GetMapping("/hotel-sales")
    public HotelSalesResponse hotelSales(@RequestParam String from, @RequestParam String to) {
        LocalDate fromDate = LocalDate.parse(from), toDate = LocalDate.parse(to);
        List<Reservation> list = reservationRepository.findAll().stream()
                .filter(r -> r.getCheckInDate() != null && r.getCheckOutDate() != null)
                .filter(r -> !r.getCheckInDate().isBefore(fromDate) && !r.getCheckInDate().isAfter(toDate))
                .toList();

        double roomRev = list.stream().mapToDouble(r -> r.getAmount() != null ? r.getAmount() : 0).sum();
        double svcRev  = list.stream().mapToDouble(r -> svcTotal(r.getId())).sum();
        long   rn      = list.stream().mapToLong(r ->
                ChronoUnit.DAYS.between(r.getCheckInDate(), r.getCheckOutDate())).sum();
        double arr     = rn > 0 ? round2(roomRev / rn) : 0;
        int totalRooms = (int) roomRepository.count();
        long days      = ChronoUnit.DAYS.between(fromDate, toDate) + 1;
        int  occ       = (totalRooms == 0 || days == 0) ? 0
                : (int) Math.min(100, Math.round(rn * 100.0 / (totalRooms * days)));

        List<SegmentRow> mealBreak = Arrays.stream(MealPlan.values()).map(mp -> {
            List<Reservation> seg = list.stream().filter(r -> mp == r.getMealPlan()).toList();
            double rev = seg.stream().mapToDouble(r -> r.getAmount() != null ? r.getAmount() : 0).sum();
            long   rns = seg.stream().mapToLong(r ->
                    ChronoUnit.DAYS.between(r.getCheckInDate(), r.getCheckOutDate())).sum();
            return SegmentRow.builder().label(mp.name()).revenue(round2(rev)).roomNights(rns)
                    .arr(rns > 0 ? round2(rev / rns) : 0).build();
        }).filter(s -> s.getRoomNights() > 0).collect(Collectors.toList());

        List<SegmentRow> srcBreak = Arrays.stream(BookingSource.values()).map(src -> {
            List<Reservation> seg = list.stream().filter(r -> src == r.getSource()).toList();
            double rev = seg.stream().mapToDouble(r -> r.getAmount() != null ? r.getAmount() : 0).sum();
            long   rns = seg.stream().mapToLong(r ->
                    ChronoUnit.DAYS.between(r.getCheckInDate(), r.getCheckOutDate())).sum();
            return SegmentRow.builder().label(sourceName(src)).revenue(round2(rev)).roomNights(rns)
                    .arr(rns > 0 ? round2(rev / rns) : 0).build();
        }).filter(s -> s.getRoomNights() > 0).collect(Collectors.toList());

        return HotelSalesResponse.builder()
                .roomNightsSold(rn).occupancyPercent(occ).arr(arr)
                .totalRevenue(round2(roomRev + svcRev))
                .roomRevenue(round2(roomRev)).serviceRevenue(round2(svcRev))
                .mealPlanBreakdown(mealBreak).sourceBreakdown(srcBreak)
                .build();
    }

    // ── Company Performance (by booking source) ───────────────────────────────
    @GetMapping("/company-perf")
    public List<CompanyPerfRow> companyPerf(@RequestParam String from, @RequestParam String to) {
        LocalDate fromDate = LocalDate.parse(from), toDate = LocalDate.parse(to);
        List<Reservation> list = reservationRepository.findAll().stream()
                .filter(r -> r.getCheckInDate() != null && r.getCheckOutDate() != null)
                .filter(r -> !r.getCheckInDate().isBefore(fromDate) && !r.getCheckInDate().isAfter(toDate))
                .toList();

        return Arrays.stream(BookingSource.values()).map(src -> {
            List<Reservation> seg = list.stream().filter(r -> src == r.getSource()).toList();
            double rev  = seg.stream().mapToDouble(r -> r.getAmount() != null ? r.getAmount() : 0).sum();
            long   rns  = seg.stream().mapToLong(r ->
                    ChronoUnit.DAYS.between(r.getCheckInDate(), r.getCheckOutDate())).sum();
            double paid = seg.stream().mapToDouble(r -> paidTotal(r.getId())).sum();
            return CompanyPerfRow.builder()
                    .source(sourceName(src)).reservationCount(seg.size())
                    .roomNights(rns).revenue(round2(rev))
                    .arr(rns > 0 ? round2(rev / rns) : 0)
                    .totalPaid(round2(paid)).outstanding(round2(rev - paid))
                    .build();
        }).filter(r -> r.getReservationCount() > 0).collect(Collectors.toList());
    }

    // ── Sales Summary (backward compat) ──────────────────────────────────────
    @GetMapping("/sales-summary")
    public SalesSummaryResponse salesSummary(@RequestParam String from, @RequestParam String to) {
        LocalDate fromDate = LocalDate.parse(from), toDate = LocalDate.parse(to);
        List<Reservation> list = reservationRepository.findByCheckInDateBetween(fromDate, toDate);
        double revenue  = list.stream().mapToDouble(r -> r.getAmount() == null ? 0.0 : r.getAmount()).sum();
        long nightsSold = list.stream().mapToLong(r ->
                r.getCheckInDate() != null && r.getCheckOutDate() != null
                        ? ChronoUnit.DAYS.between(r.getCheckInDate(), r.getCheckOutDate()) : 0).sum();
        double arr      = list.isEmpty() ? 0.0 : revenue / list.size();
        long totalRooms = roomRepository.count();
        long days       = ChronoUnit.DAYS.between(fromDate, toDate) + 1;
        int occ = (int) Math.min(100, totalRooms == 0 || days == 0 ? 0
                : Math.round(nightsSold * 100.0 / (totalRooms * days)));
        return SalesSummaryResponse.builder()
                .roomNightsSold(nightsSold).occupancyPercent(occ)
                .totalRevenue(revenue).avgRoomRate(arr).build();
    }

    // ── Private helpers ───────────────────────────────────────────────────────
    private ArrivalReportRow toRow(Reservation r) {
        return ArrivalReportRow.builder()
                .reservationId(r.getId())
                .guestName(r.getGuestName()).guestPhone(r.getGuestPhone()).guestEmail(r.getGuestEmail())
                .source(sourceName(r.getSource()))
                .mealPlan(r.getMealPlan() != null ? r.getMealPlan().name() : null)
                .roomNo(r.getRoom() != null ? r.getRoom().getRoomNumber() : "—")
                .checkIn(r.getCheckInDate()).checkOut(r.getCheckOutDate())
                .pax(r.getGuestsCount())
                .status(r.getStatus() != null ? r.getStatus().name() : "UNKNOWN")
                .amount(r.getAmount())
                .build();
    }

    private PaymentRow toPaymentRow(Payment p) {
        Reservation r = p.getReservation();
        return PaymentRow.builder()
                .paymentId(p.getId())
                .reservationId(r != null ? r.getId() : null)
                .guestName(r != null ? r.getGuestName() : "—")
                .roomNumber(r != null && r.getRoom() != null ? r.getRoom().getRoomNumber() : "—")
                .paymentDate(p.getPaymentDate() != null ? p.getPaymentDate().toString() : "—")
                .amount(p.getAmount())
                .paymentMode(p.getPaymentMode() != null ? p.getPaymentMode().name() : "—")
                .remarks(p.getRemarks())
                .build();
    }

    private double nightlyRevenue(List<Reservation> list) {
        return list.stream().mapToDouble(r -> {
            long n = ChronoUnit.DAYS.between(r.getCheckInDate(), r.getCheckOutDate());
            return n > 0 && r.getAmount() != null ? r.getAmount() / n : 0;
        }).sum();
    }

    private double srcRev(List<Reservation> list, BookingSource src) {
        return list.stream().filter(r -> src == r.getSource()).mapToDouble(r -> {
            long n = ChronoUnit.DAYS.between(r.getCheckInDate(), r.getCheckOutDate());
            return n > 0 && r.getAmount() != null ? r.getAmount() / n : 0;
        }).sum();
    }

    private double svcTotal(Long reservationId) {
        return serviceChargeRepository.findByReservationId(reservationId)
                .stream().mapToDouble(ServiceCharge::getAmount).sum();
    }

    private double paidTotal(Long reservationId) {
        return paymentRepository.findByReservationId(reservationId)
                .stream().mapToDouble(Payment::getAmount).sum();
    }

    private String sourceName(BookingSource src) {
        if (src == null) return "PMS";
        return switch (src) {
            case PMS     -> "PMS";
            case OTA     -> "OTA";
            case WALK_IN -> "Walk-in";
            case PHONE   -> "Phone";
            case EMAIL   -> "Email";
        };
    }

    private double round2(double v) {
        return Math.round(v * 100.0) / 100.0;
    }
}
