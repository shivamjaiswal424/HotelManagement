package com.hotel.backend.Service;

import com.hotel.backend.Entity.*;
import com.hotel.backend.Repository.*;
import lombok.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.*;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ICalSyncService {

    private final OtaSyncConfigRepository  configRepository;
    private final OtaSyncLogRepository     logRepository;
    private final ReservationRepository    reservationRepository;
    private final RoomRepository           roomRepository;

    // ── Scheduled: run every 30 minutes ──────────────────────────────────────

    @Scheduled(fixedRate = 30 * 60 * 1000)
    public void scheduledSync() {
        configRepository.findByEnabledTrue().forEach(config -> {
            try { sync(config); } catch (Exception e) {
                log.error("Scheduled sync failed for {}: {}", config.getOtaName(), e.getMessage());
            }
        });
    }

    // ── Manual sync (called from controller) ─────────────────────────────────

    public OtaSyncLog sync(OtaSyncConfig config) {
        OtaSyncLog entry = OtaSyncLog.builder()
                .otaName(config.getOtaName())
                .syncedAt(LocalDateTime.now())
                .build();
        try {
            String icsContent = fetchIcal(config.getIcalUrl());
            List<ICalEvent> events = parseIcal(icsContent);

            int newCount = 0, skipCount = 0;
            for (ICalEvent event : events) {
                if (event.uid == null || event.checkIn == null || event.checkOut == null
                        || event.checkIn.isAfter(event.checkOut) || event.blocked) {
                    skipCount++; continue;
                }
                if (reservationRepository.findByExternalBookingId(event.uid).isPresent()) {
                    skipCount++; continue;
                }
                createReservation(event, config);
                newCount++;
            }

            entry.setNewBookings(newCount);
            entry.setSkipped(skipCount);
            entry.setStatus("SUCCESS");
            entry.setMessage(newCount + " new booking(s) imported, " + skipCount + " skipped");

            config.setLastSyncAt(LocalDateTime.now());
            config.setLastSyncStatus("SUCCESS");

        } catch (Exception e) {
            entry.setStatus("ERROR");
            entry.setMessage(e.getMessage());
            config.setLastSyncStatus("ERROR");
            log.error("iCal sync error for {}: {}", config.getOtaName(), e.getMessage());
        }

        configRepository.save(config);
        return logRepository.save(entry);
    }

    // ── Test URL without saving anything ─────────────────────────────────────

    public Map<String, Object> testUrl(String url) {
        try {
            String content = fetchIcal(url);
            List<ICalEvent> events = parseIcal(content);
            long bookings = events.stream().filter(e -> !e.blocked).count();
            return Map.of("valid", true, "totalEvents", events.size(), "bookings", bookings,
                    "message", "URL is valid — " + bookings + " booking event(s) found");
        } catch (Exception e) {
            return Map.of("valid", false, "message", "Failed: " + e.getMessage());
        }
    }

    // ── iCal fetcher ──────────────────────────────────────────────────────────

    private String fetchIcal(String url) throws Exception {
        HttpClient client = HttpClient.newBuilder()
                .followRedirects(HttpClient.Redirect.NORMAL)
                .connectTimeout(Duration.ofSeconds(30))
                .build();
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("User-Agent", "Mozilla/5.0 (compatible; HotelPMS/1.0)")
                .timeout(Duration.ofSeconds(30))
                .GET().build();
        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() != 200)
            throw new RuntimeException("HTTP " + response.statusCode());
        return response.body();
    }

    // ── iCal parser ───────────────────────────────────────────────────────────

    public List<ICalEvent> parseIcal(String content) {
        // RFC 5545: unfold continuation lines (CRLF + SPACE/TAB)
        content = content.replaceAll("\r?\n[ \t]", "");

        List<ICalEvent> events = new ArrayList<>();
        Map<String, String> props = null;

        for (String raw : content.split("\r?\n")) {
            String line = raw.trim();
            if (line.equals("BEGIN:VEVENT")) {
                props = new HashMap<>();
            } else if (line.equals("END:VEVENT") && props != null) {
                ICalEvent ev = mapToEvent(props);
                if (ev != null) events.add(ev);
                props = null;
            } else if (props != null) {
                int colon = line.indexOf(':');
                if (colon > 0) {
                    String key   = line.substring(0, colon).split(";")[0].toUpperCase().trim();
                    String value = line.substring(colon + 1).trim()
                            .replace("\\n", "\n").replace("\\,", ",").replace("\\;", ";");
                    props.put(key, value);
                }
            }
        }
        return events;
    }

    private ICalEvent mapToEvent(Map<String, String> p) {
        String uid     = p.get("UID");
        LocalDate ci   = parseIcalDate(p.get("DTSTART"));
        LocalDate co   = parseIcalDate(p.get("DTEND"));
        String summary = p.getOrDefault("SUMMARY", "");
        String desc    = p.getOrDefault("DESCRIPTION", "");
        if (uid == null || ci == null || co == null) return null;

        String guest   = extractGuestName(summary, desc);
        boolean block  = isBlockedDate(summary, guest);
        return new ICalEvent(uid, ci, co, summary, desc, guest, block);
    }

    private LocalDate parseIcalDate(String s) {
        if (s == null) return null;
        try {
            String d = s.replaceAll("[TZ].*", "").replace("-", "");
            if (d.length() == 8)
                return LocalDate.of(
                        Integer.parseInt(d.substring(0, 4)),
                        Integer.parseInt(d.substring(4, 6)),
                        Integer.parseInt(d.substring(6, 8)));
        } catch (Exception ignored) {}
        return null;
    }

    private String extractGuestName(String summary, String description) {
        // Description: "Guest name: John Smith" or "Guest: John Smith"
        for (String line : description.split("\n")) {
            String l = line.trim();
            String lower = l.toLowerCase();
            if (lower.startsWith("guest name:") || lower.startsWith("guest:")) {
                String name = l.split(":", 2)[1].trim();
                if (!name.isBlank()) return name;
            }
        }
        // Summary: "CLOSED - John Smith"
        if (summary.contains(" - ")) {
            String part = summary.split(" - ", 2)[1].trim();
            if (!part.isBlank() && !part.equalsIgnoreCase("Not available")
                    && !part.equalsIgnoreCase("Blocked")) return part;
        }
        // Plain summary (not a system keyword)
        String up = summary.toUpperCase();
        if (!up.contains("CLOSED") && !up.contains("BLOCKED") && !up.contains("NOT AVAILABLE")
                && !up.contains("BOOKING") && !summary.isBlank()) return summary.trim();
        return null;
    }

    private boolean isBlockedDate(String summary, String guest) {
        if (guest == null) return true;
        String up = summary.toUpperCase();
        return up.contains("NOT AVAILABLE") || up.contains("BLOCKED") || up.contains("CLOSED");
    }

    // ── Reservation creation ──────────────────────────────────────────────────

    private void createReservation(ICalEvent event, OtaSyncConfig config) {
        Room room = findAvailableRoom(config.getRoomType(), event.checkIn, event.checkOut);
        long nights = ChronoUnit.DAYS.between(event.checkIn, event.checkOut);
        double rate = room != null ? room.getBasePrice() : 0;

        Reservation r = Reservation.builder()
                .guestName(event.guestName != null ? event.guestName : "Booking.com Guest")
                .guestEmail("").guestPhone("")
                .checkInDate(event.checkIn)
                .checkOutDate(event.checkOut)
                .guestsCount(1)
                .amount(rate * nights)
                .room(room)
                .status(ReservationStatus.BOOKED)
                .source(BookingSource.OTA)
                .externalBookingId(event.uid)
                .build();
        reservationRepository.save(r);
    }

    private Room findAvailableRoom(RoomType roomType, LocalDate checkIn, LocalDate checkOut) {
        List<Room> candidates = roomRepository.findAll().stream()
                .filter(r -> r.getRoomType() == roomType
                        && r.getRoomStatus() != RoomStatus.OUT_OF_ORDER
                        && r.getRoomStatus() != RoomStatus.MAINTENANCE)
                .collect(Collectors.toList());

        // end-1 day because the check-out day itself is free
        List<Reservation> overlapping = reservationRepository
                .findByCheckInDateLessThanEqualAndCheckOutDateGreaterThan(checkOut.minusDays(1), checkIn);

        Set<Long> takenIds = overlapping.stream()
                .filter(r -> r.getStatus() == ReservationStatus.BOOKED
                        || r.getStatus() == ReservationStatus.CHECKED_IN)
                .filter(r -> r.getRoom() != null)
                .map(r -> r.getRoom().getId())
                .collect(Collectors.toSet());

        return candidates.stream().filter(r -> !takenIds.contains(r.getId())).findFirst().orElse(null);
    }

    // ── Inner event DTO ───────────────────────────────────────────────────────

    @AllArgsConstructor
    static class ICalEvent {
        String    uid;
        LocalDate checkIn;
        LocalDate checkOut;
        String    summary;
        String    description;
        String    guestName;
        boolean   blocked;
    }
}
