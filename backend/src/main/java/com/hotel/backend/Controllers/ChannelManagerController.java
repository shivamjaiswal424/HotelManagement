package com.hotel.backend.Controllers;

import com.hotel.backend.DTO.*;
import com.hotel.backend.Entity.*;
import com.hotel.backend.Repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;
import java.util.Optional;

@RestController
@RequestMapping("/api/channel")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class ChannelManagerController {

    private final RatePlanRepository              ratePlanRepository;
    private final RateCalendarRepository          rateCalendarRepository;
    private final InventoryCalendarRepository     inventoryCalendarRepository;
    private final RoomRepository                  roomRepository;
    private final ReservationRepository           reservationRepository;
    private final RateRestrictionRepository       rateRestrictionRepository;
    private final InventoryRestrictionRepository  inventoryRestrictionRepository;

    // ── Existing endpoints ────────────────────────────────────────────────────

    @GetMapping("/rateplans")
    public List<RatePlan> getRatePlans() {
        return ratePlanRepository.findAll();
    }

    @PostMapping("/bulk-update/rate")
    public Map<String, Object> bulkUpdateRate(@RequestBody BulkRateUpdateRequest req) {
        LocalDate from = LocalDate.parse(req.getFromDate());
        LocalDate to   = LocalDate.parse(req.getToDate());
        Set<DayOfWeek> allowed = parseWeekdays(req.getWeekdays());
        int updated = 0;
        for (LocalDate d = from; !d.isAfter(to); d = d.plusDays(1)) {
            if (!allowed.isEmpty() && !allowed.contains(d.getDayOfWeek())) continue;
            for (BulkRateUpdateRequest.RatePlanRate u : req.getUpdates()) {
                RateCalendar cal = rateCalendarRepository
                        .findByRatePlanIdAndDate(u.getRatePlanId(), d)
                        .orElse(RateCalendar.builder().ratePlanId(u.getRatePlanId()).date(d).build());
                cal.setRate(u.getValue());
                rateCalendarRepository.save(cal);
                updated++;
            }
        }
        return Map.of("status", "OK", "updated", updated);
    }

    @PostMapping("/bulk-update/inventory")
    public Map<String, Object> bulkUpdateInventory(@RequestBody BulkInventoryUpdateRequest req) {
        LocalDate from = LocalDate.parse(req.getFromDate());
        LocalDate to   = LocalDate.parse(req.getToDate());
        Set<DayOfWeek> allowed = parseWeekdays(req.getWeekdays());
        int updated = 0;
        for (LocalDate d = from; !d.isAfter(to); d = d.plusDays(1)) {
            if (!allowed.isEmpty() && !allowed.contains(d.getDayOfWeek())) continue;
            for (BulkInventoryUpdateRequest.RoomTypeInventory u : req.getUpdates()) {
                RoomType rt = RoomType.valueOf(u.getRoomType());
                InventoryCalendar cal = inventoryCalendarRepository
                        .findByRoomTypeAndDate(rt, d)
                        .orElse(InventoryCalendar.builder().roomType(rt).date(d).build());
                cal.setAvailableRooms(u.getValue());
                inventoryCalendarRepository.save(cal);
                updated++;
            }
        }
        return Map.of("status", "OK", "updated", updated);
    }

    // ── Rates Grid ────────────────────────────────────────────────────────────

    @GetMapping("/rates-grid")
    public RatesGridResponse getRatesGrid(
            @RequestParam String from,
            @RequestParam(defaultValue = "10") int days) {

        LocalDate start = LocalDate.parse(from);
        LocalDate end   = start.plusDays(days - 1);

        List<String> dates = new ArrayList<>();
        for (LocalDate d = start; !d.isAfter(end); d = d.plusDays(1))
            dates.add(d.toString());

        List<RatePlan> plans = ratePlanRepository.findAll();

        List<RateCalendar> calEntries = rateCalendarRepository.findByDateBetween(start, end);
        Map<Long, Map<String, Double>> rateMap = new HashMap<>();
        for (RateCalendar rc : calEntries)
            rateMap.computeIfAbsent(rc.getRatePlanId(), k -> new HashMap<>())
                   .put(rc.getDate().toString(), rc.getRate());

        List<RatesGridResponse.RatePlanRow> planRows = plans.stream()
                .map(p -> RatesGridResponse.RatePlanRow.builder()
                        .id(p.getId())
                        .name(p.getName())
                        .roomType(p.getRoomType() != null ? p.getRoomType().name() : null)
                        .mealPlan(p.getMealPlan())
                        .category(p.getCategory())
                        .rates(rateMap.getOrDefault(p.getId(), Collections.emptyMap()))
                        .build())
                .collect(Collectors.toList());

        List<Reservation> reservations = reservationRepository
                .findByCheckInDateLessThanEqualAndCheckOutDateGreaterThan(end, start);
        int totalRooms = (int) roomRepository.count();

        List<RatesGridResponse.DateStat> dateStats = dates.stream().map(ds -> {
            LocalDate d = LocalDate.parse(ds);
            long occupied = reservations.stream()
                    .filter(r -> r.getCheckInDate() != null && r.getCheckOutDate() != null)
                    .filter(r -> !r.getCheckInDate().isAfter(d) && r.getCheckOutDate().isAfter(d))
                    .filter(r -> r.getStatus() == ReservationStatus.BOOKED
                              || r.getStatus() == ReservationStatus.CHECKED_IN)
                    .count();
            double occPct = totalRooms > 0 ? Math.round((double) occupied / totalRooms * 1000.0) / 10.0 : 0;

            OptionalDouble avg = plans.stream()
                    .map(p -> rateMap.getOrDefault(p.getId(), Collections.emptyMap()).get(ds))
                    .filter(Objects::nonNull)
                    .mapToDouble(v -> v)
                    .average();

            return RatesGridResponse.DateStat.builder()
                    .date(ds)
                    .occupied((int) occupied)
                    .totalRooms(totalRooms)
                    .occupancyPct(occPct)
                    .recommendedRate(avg.isPresent() ? avg.getAsDouble() : null)
                    .build();
        }).collect(Collectors.toList());

        return RatesGridResponse.builder()
                .dates(dates)
                .ratePlans(planRows)
                .dateStats(dateStats)
                .build();
    }

    @PostMapping("/rates-grid/cell")
    public Map<String, Object> saveRateCell(@RequestBody CellRateRequest req) {
        LocalDate date = LocalDate.parse(req.getDate());
        RateCalendar cal = rateCalendarRepository
                .findByRatePlanIdAndDate(req.getRatePlanId(), date)
                .orElse(RateCalendar.builder().ratePlanId(req.getRatePlanId()).date(date).build());
        cal.setRate(req.getRate());
        rateCalendarRepository.save(cal);
        return Map.of("status", "OK");
    }

    // ── Inventory Grid ────────────────────────────────────────────────────────

    @GetMapping("/inventory-grid")
    public InventoryGridResponse getInventoryGrid(
            @RequestParam String from,
            @RequestParam(defaultValue = "10") int days) {

        LocalDate start = LocalDate.parse(from);
        LocalDate end   = start.plusDays(days - 1);

        List<String> dates = new ArrayList<>();
        for (LocalDate d = start; !d.isAfter(end); d = d.plusDays(1))
            dates.add(d.toString());

        List<Room> allRooms = roomRepository.findAll();
        Map<RoomType, Long> countByType = allRooms.stream()
                .collect(Collectors.groupingBy(Room::getRoomType, Collectors.counting()));

        List<InventoryCalendar> invEntries = inventoryCalendarRepository.findByDateBetween(start, end);
        Map<RoomType, Map<String, Integer>> invMap = new HashMap<>();
        for (InventoryCalendar ic : invEntries)
            invMap.computeIfAbsent(ic.getRoomType(), k -> new HashMap<>())
                  .put(ic.getDate().toString(), ic.getAvailableRooms());

        List<Reservation> reservations = reservationRepository
                .findByCheckInDateLessThanEqualAndCheckOutDateGreaterThan(end, start);

        List<InventoryGridResponse.RoomTypeRow> roomTypeRows = Arrays.stream(RoomType.values())
                .map(rt -> {
                    int total = countByType.getOrDefault(rt, 0L).intValue();
                    Map<String, Integer> inv = new HashMap<>();
                    for (String ds : dates) {
                        Integer explicit = invMap.getOrDefault(rt, Collections.emptyMap()).get(ds);
                        if (explicit != null) {
                            inv.put(ds, explicit);
                        } else {
                            LocalDate d = LocalDate.parse(ds);
                            long occupied = reservations.stream()
                                    .filter(r -> r.getRoom() != null && r.getRoom().getRoomType() == rt)
                                    .filter(r -> r.getCheckInDate() != null && r.getCheckOutDate() != null)
                                    .filter(r -> !r.getCheckInDate().isAfter(d) && r.getCheckOutDate().isAfter(d))
                                    .filter(r -> r.getStatus() == ReservationStatus.BOOKED
                                              || r.getStatus() == ReservationStatus.CHECKED_IN)
                                    .count();
                            inv.put(ds, (int) Math.max(0, total - occupied));
                        }
                    }
                    return InventoryGridResponse.RoomTypeRow.builder()
                            .type(rt.name())
                            .label(rt.name().replace("_", " "))
                            .totalCount(total)
                            .inventory(inv)
                            .build();
                })
                .collect(Collectors.toList());

        int totalAll = allRooms.size();
        List<InventoryGridResponse.TotalRow> totals = dates.stream().map(ds -> {
            int avail = roomTypeRows.stream()
                    .mapToInt(rt -> rt.getInventory().getOrDefault(ds, 0))
                    .sum();
            double occ = totalAll > 0
                    ? Math.round((double)(totalAll - avail) / totalAll * 1000.0) / 10.0 : 0;
            return InventoryGridResponse.TotalRow.builder()
                    .date(ds)
                    .available(avail)
                    .total(totalAll)
                    .occupancyPct(occ)
                    .build();
        }).collect(Collectors.toList());

        return InventoryGridResponse.builder()
                .dates(dates)
                .roomTypes(roomTypeRows)
                .totals(totals)
                .build();
    }

    @PostMapping("/inventory-grid/cell")
    public Map<String, Object> saveInventoryCell(@RequestBody CellInventoryRequest req) {
        LocalDate date = LocalDate.parse(req.getDate());
        RoomType rt    = RoomType.valueOf(req.getRoomType());
        InventoryCalendar cal = inventoryCalendarRepository
                .findByRoomTypeAndDate(rt, date)
                .orElse(InventoryCalendar.builder().roomType(rt).date(date).build());
        cal.setAvailableRooms(req.getAvailableRooms());
        inventoryCalendarRepository.save(cal);
        return Map.of("status", "OK");
    }

    // ── Applicable rate lookup (used by Create Reservation & Rooms View) ─────

    @GetMapping("/applicable-rate")
    public Map<String, Object> getApplicableRate(
            @RequestParam String roomType,
            @RequestParam(required = false) String mealPlan,
            @RequestParam String date) {

        LocalDate localDate = LocalDate.parse(date);
        RoomType rt = RoomType.valueOf(roomType);

        List<RatePlan> plans = ratePlanRepository.findAll().stream()
                .filter(p -> p.getRoomType() == rt)
                .collect(Collectors.toList());

        // Prefer matching meal plan if provided
        if (mealPlan != null && !mealPlan.isBlank()) {
            List<RatePlan> matching = plans.stream()
                    .filter(p -> mealPlan.equalsIgnoreCase(p.getMealPlan()))
                    .collect(Collectors.toList());
            if (!matching.isEmpty()) plans = matching;
        }

        for (RatePlan plan : plans) {
            Optional<RateCalendar> cal = rateCalendarRepository.findByRatePlanIdAndDate(plan.getId(), localDate);
            if (cal.isPresent() && cal.get().getRate() != null && cal.get().getRate() > 0) {
                return Map.of(
                        "rate",         cal.get().getRate(),
                        "source",       "RATE_CALENDAR",
                        "ratePlanName", plan.getName() != null ? plan.getName() : ""
                );
            }
        }

        // Fall back to room basePrice
        double basePrice = roomRepository.findAll().stream()
                .filter(r -> r.getRoomType() == rt)
                .mapToDouble(Room::getBasePrice)
                .findFirst().orElse(0.0);

        return Map.of("rate", basePrice, "source", "BASE_PRICE", "ratePlanName", "");
    }

    // ── Today rates for all room types (used by Rooms View card display) ─────

    @GetMapping("/today-rates")
    public Map<String, Object> getTodayRates() {
        LocalDate today = LocalDate.now();
        Map<String, Object> result = new HashMap<>();

        for (RoomType rt : RoomType.values()) {
            List<RatePlan> plans = ratePlanRepository.findAll().stream()
                    .filter(p -> p.getRoomType() == rt)
                    .collect(Collectors.toList());

            double rate = 0;
            boolean fromCalendar = false;
            for (RatePlan plan : plans) {
                Optional<RateCalendar> cal = rateCalendarRepository.findByRatePlanIdAndDate(plan.getId(), today);
                if (cal.isPresent() && cal.get().getRate() != null && cal.get().getRate() > 0) {
                    rate = cal.get().getRate();
                    fromCalendar = true;
                    break;
                }
            }

            if (!fromCalendar) {
                rate = roomRepository.findAll().stream()
                        .filter(r -> r.getRoomType() == rt)
                        .mapToDouble(Room::getBasePrice)
                        .findFirst().orElse(0.0);
            }

            result.put(rt.name(), Map.of("rate", rate, "fromCalendar", fromCalendar));
        }
        return result;
    }

    // ── Bulk Increment ────────────────────────────────────────────────────────

    @PostMapping("/bulk-update/increment")
    public Map<String, Object> bulkIncrement(@RequestBody BulkIncrementRequest req) {
        LocalDate from = LocalDate.parse(req.getFromDate());
        LocalDate to   = LocalDate.parse(req.getToDate());
        Set<DayOfWeek> allowed = parseWeekdays(req.getWeekdays());
        int updated = 0;

        for (LocalDate d = from; !d.isAfter(to); d = d.plusDays(1)) {
            if (!allowed.isEmpty() && !allowed.contains(d.getDayOfWeek())) continue;
            for (BulkIncrementRequest.RatePlanIncrement u : req.getUpdates()) {
                if (u.getIncrement() == null) continue;
                RateCalendar cal = rateCalendarRepository
                        .findByRatePlanIdAndDate(u.getRatePlanId(), d)
                        .orElse(RateCalendar.builder().ratePlanId(u.getRatePlanId()).date(d).rate(0.0).build());
                double current = cal.getRate() != null ? cal.getRate() : 0.0;
                cal.setRate(Math.max(0, current + u.getIncrement()));
                rateCalendarRepository.save(cal);
                updated++;
            }
        }
        return Map.of("status", "OK", "updated", updated);
    }

    // ── Bulk Restrictions ─────────────────────────────────────────────────────

    @PostMapping("/bulk-update/restrictions")
    public Map<String, Object> bulkRestrictions(@RequestBody BulkRestrictionRequest req) {
        LocalDate from = LocalDate.parse(req.getFromDate());
        LocalDate to   = LocalDate.parse(req.getToDate());
        Set<DayOfWeek> allowed = parseWeekdays(req.getWeekdays());
        int updated = 0;
        boolean isRate = "RATE".equalsIgnoreCase(req.getRestrictionType());

        for (LocalDate d = from; !d.isAfter(to); d = d.plusDays(1)) {
            if (!allowed.isEmpty() && !allowed.contains(d.getDayOfWeek())) continue;
            for (BulkRestrictionRequest.RestrictionEntry u : req.getUpdates()) {
                if (isRate) {
                    if (u.getRatePlanId() == null) continue;
                    final LocalDate fd = d;
                    RateRestriction r = rateRestrictionRepository
                            .findByRatePlanIdAndDate(u.getRatePlanId(), fd)
                            .orElse(RateRestriction.builder().ratePlanId(u.getRatePlanId()).date(fd).build());
                    if (u.getStopSell()         != null) r.setStopSell(u.getStopSell());
                    if (u.getCloseOnArrival()   != null) r.setCloseOnArrival(u.getCloseOnArrival());
                    if (u.getCloseOnDeparture() != null) r.setCloseOnDeparture(u.getCloseOnDeparture());
                    if (u.getMinStay()          != null) r.setMinStay(u.getMinStay());
                    if (u.getMaxStay()          != null) r.setMaxStay(u.getMaxStay());
                    rateRestrictionRepository.save(r);
                } else {
                    if (u.getRoomType() == null) continue;
                    RoomType rt = RoomType.valueOf(u.getRoomType());
                    final LocalDate fd = d;
                    InventoryRestriction r = inventoryRestrictionRepository
                            .findByRoomTypeAndDate(rt, fd)
                            .orElse(InventoryRestriction.builder().roomType(rt).date(fd).build());
                    if (u.getStopSell()         != null) r.setStopSell(u.getStopSell());
                    if (u.getCloseOnArrival()   != null) r.setCloseOnArrival(u.getCloseOnArrival());
                    if (u.getCloseOnDeparture() != null) r.setCloseOnDeparture(u.getCloseOnDeparture());
                    if (u.getMinStay()          != null) r.setMinStay(u.getMinStay());
                    if (u.getMaxStay()          != null) r.setMaxStay(u.getMaxStay());
                    inventoryRestrictionRepository.save(r);
                }
                updated++;
            }
        }
        return Map.of("status", "OK", "updated", updated);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static final Map<String, DayOfWeek> DAY_MAP = Map.of(
        "MON", DayOfWeek.MONDAY,    "TUE", DayOfWeek.TUESDAY,
        "WED", DayOfWeek.WEDNESDAY, "THU", DayOfWeek.THURSDAY,
        "FRI", DayOfWeek.FRIDAY,    "SAT", DayOfWeek.SATURDAY,
        "SUN", DayOfWeek.SUNDAY
    );

    private Set<DayOfWeek> parseWeekdays(List<String> weekdays) {
        if (weekdays == null || weekdays.isEmpty()) return Set.of();
        Set<DayOfWeek> set = new HashSet<>();
        for (String w : weekdays) {
            DayOfWeek day = DAY_MAP.getOrDefault(w, null);
            if (day == null) { try { day = DayOfWeek.valueOf(w); } catch (IllegalArgumentException ignored) {} }
            if (day != null) set.add(day);
        }
        return set;
    }
}
