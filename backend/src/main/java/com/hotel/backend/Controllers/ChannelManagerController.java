package com.hotel.backend.Controllers;

import com.hotel.backend.DTO.BulkInventoryUpdateRequest;
import com.hotel.backend.DTO.BulkRateUpdateRequest;
import com.hotel.backend.Entity.InventoryCalendar;
import com.hotel.backend.Entity.RateCalendar;
import com.hotel.backend.Entity.RatePlan;
import com.hotel.backend.Entity.RoomType;
import com.hotel.backend.Repository.InventoryCalendarRepository;
import com.hotel.backend.Repository.RateCalendarRepository;
import com.hotel.backend.Repository.RatePlanRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.*;

@RestController
@RequestMapping("/api/channel")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class ChannelManagerController {

    private final RatePlanRepository ratePlanRepository;
    private final RateCalendarRepository rateCalendarRepository;
    private final InventoryCalendarRepository inventoryCalendarRepository;

    // ✅ get rate plans (checkbox list in bulk update)
    @GetMapping("/rateplans")
    public List<RatePlan> getRatePlans() {
        return ratePlanRepository.findAll();
    }

    // ✅ Bulk Update: RATE
    @PostMapping("/bulk-update/rate")
    public Map<String, Object> bulkUpdateRate(@RequestBody BulkRateUpdateRequest req) {
        LocalDate from = LocalDate.parse(req.getFromDate());
        LocalDate to = LocalDate.parse(req.getToDate());

        Set<DayOfWeek> allowedDays = parseWeekdays(req.getWeekdays());

        int updated = 0;

        for (LocalDate d = from; !d.isAfter(to); d = d.plusDays(1)) {
            if (!allowedDays.isEmpty() && !allowedDays.contains(d.getDayOfWeek())) continue;

            for (BulkRateUpdateRequest.RatePlanRate u : req.getUpdates()) {
                RateCalendar cal = rateCalendarRepository
                        .findByRatePlanIdAndDate(u.getRatePlanId(), d)
                        .orElse(RateCalendar.builder()
                                .ratePlanId(u.getRatePlanId())
                                .date(d)
                                .build());

                cal.setRate(u.getValue());
                rateCalendarRepository.save(cal);
                updated++;
            }
        }

        return Map.of("status", "OK", "updated", updated);
    }

    // ✅ Bulk Update: INVENTORY
    @PostMapping("/bulk-update/inventory")
    public Map<String, Object> bulkUpdateInventory(@RequestBody BulkInventoryUpdateRequest req) {

        LocalDate from = LocalDate.parse(req.getFromDate());
        LocalDate to = LocalDate.parse(req.getToDate());

        Set<DayOfWeek> allowedDays = parseWeekdays(req.getWeekdays());

        int updated = 0;

        // 👇 d is declared here
        for (LocalDate d = from; !d.isAfter(to); d = d.plusDays(1)) {

            if (!allowedDays.isEmpty() && !allowedDays.contains(d.getDayOfWeek()))
                continue;

            for (BulkInventoryUpdateRequest.RoomTypeInventory u : req.getUpdates()) {

                RoomType roomTypeEnum = RoomType.valueOf(u.getRoomType());

                InventoryCalendar cal = inventoryCalendarRepository
                        .findByRoomTypeAndDate(roomTypeEnum, d)
                        .orElse(InventoryCalendar.builder()
                                .roomType(roomTypeEnum)
                                .date(d)
                                .build());

                cal.setAvailableRooms(u.getValue());
                inventoryCalendarRepository.save(cal);
                updated++;
            }
        }

        return Map.of("status", "OK", "updated", updated);
    }


    private static final Map<String, DayOfWeek> DAY_MAP = Map.of(
        "MON", DayOfWeek.MONDAY,
        "TUE", DayOfWeek.TUESDAY,
        "WED", DayOfWeek.WEDNESDAY,
        "THU", DayOfWeek.THURSDAY,
        "FRI", DayOfWeek.FRIDAY,
        "SAT", DayOfWeek.SATURDAY,
        "SUN", DayOfWeek.SUNDAY
    );

    private Set<DayOfWeek> parseWeekdays(List<String> weekdays) {
        if (weekdays == null || weekdays.isEmpty()) return Set.of();
        Set<DayOfWeek> set = new HashSet<>();
        for (String w : weekdays) {
            DayOfWeek day = DAY_MAP.getOrDefault(w, null);
            if (day == null) {
                try { day = DayOfWeek.valueOf(w); } catch (IllegalArgumentException ignored) {}
            }
            if (day != null) set.add(day);
        }
        return set;
    }
}
