package com.hotel.backend.Service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotel.backend.Entity.ReservationStatus;
import com.hotel.backend.Entity.RoomType;
import com.hotel.backend.Repository.ReservationRepository;
import com.hotel.backend.Repository.RoomRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.*;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AIService {

    private final ReservationRepository reservationRepository;
    private final RoomRepository        roomRepository;

    @Value("${app.ai.provider:gemini}") private String provider;
    @Value("${app.ai.key}")             private String apiKey;

    private final ObjectMapper mapper = new ObjectMapper();

    public String chat(String userMessage) {
        String context = buildContext();
        return provider.equalsIgnoreCase("openai")
            ? callOpenAI(context, userMessage)
            : callGemini(context, userMessage);
    }

    // ── Rich context with occupancy, revenue, upcoming reservations ───────────

    private String buildContext() {
        LocalDate today = LocalDate.now();

        long occupied  = roomRepository.findAll().stream()
            .filter(r -> r.getRoomStatus().name().equals("OCCUPIED")).count();
        long available = roomRepository.findAll().stream()
            .filter(r -> r.getRoomStatus().name().equals("AVAILABLE")).count();
        long total     = roomRepository.count();

        long checkinsToday  = reservationRepository.findByCheckInDate(today).stream()
            .filter(r -> r.getStatus() == ReservationStatus.BOOKED
                      || r.getStatus() == ReservationStatus.CHECKED_IN).count();
        long checkoutsToday = reservationRepository.findByCheckOutDate(today).stream()
            .filter(r -> r.getStatus() == ReservationStatus.CHECKED_IN).count();

        // Room type rates
        double deluxeRate = roomRepository.findAll().stream()
            .filter(r -> r.getRoomType() == RoomType.DELUXE)
            .mapToDouble(r -> r.getBasePrice()).average().orElse(0);
        double superRate  = roomRepository.findAll().stream()
            .filter(r -> r.getRoomType() == RoomType.SUPER_DELUXE)
            .mapToDouble(r -> r.getBasePrice()).average().orElse(0);

        // Currently checked-in with nights detail
        String currentGuests = reservationRepository
            .findByStatus(ReservationStatus.CHECKED_IN).stream()
            .map(r -> {
                long nights = r.getCheckInDate() != null && r.getCheckOutDate() != null
                    ? ChronoUnit.DAYS.between(r.getCheckInDate(), r.getCheckOutDate()) : 0;
                return "- " + r.getGuestName()
                    + " | Room " + (r.getRoom() != null ? r.getRoom().getRoomNumber() : "?")
                    + " (" + (r.getRoom() != null ? r.getRoom().getRoomType().name().replace("_", " ") : "") + ")"
                    + " | Checked in: " + r.getCheckInDate()
                    + " | Checkout: " + r.getCheckOutDate()
                    + " | " + nights + " nights"
                    + (r.getMealPlan() != null ? " | Meal: " + r.getMealPlan().name() : "");
            })
            .collect(Collectors.joining("\n"));

        // Upcoming arrivals — next 14 days
        String upcoming = reservationRepository
            .findByCheckInDateBetween(today.plusDays(1), today.plusDays(14)).stream()
            .filter(r -> r.getStatus() == ReservationStatus.BOOKED)
            .map(r -> "- " + r.getGuestName()
                + " | Room " + (r.getRoom() != null ? r.getRoom().getRoomNumber() : "?")
                + " | Arrives: " + r.getCheckInDate()
                + " | Departs: " + r.getCheckOutDate())
            .collect(Collectors.joining("\n"));

        // Past 30 days revenue
        double revenue30 = reservationRepository
            .findByCheckInDateBetween(today.minusDays(30), today).stream()
            .mapToDouble(r -> r.getAmount() != null ? r.getAmount() : 0).sum();

        return """
            You are an AI assistant for Annapurna Banquets and Inn hotel.
            Answer staff questions concisely and accurately using the live data below.
            Today: %s (%s)

            ROOMS: %d total | %d occupied | %d available
            Deluxe rate: ₹%.0f/night | Super Deluxe rate: ₹%.0f/night

            TODAY: %d check-ins due | %d check-outs due
            PAST 30 DAYS REVENUE: ₹%.0f

            CURRENTLY IN-HOUSE:
            %s

            UPCOMING ARRIVALS (next 14 days):
            %s

            Answer naturally. For actions like checkout or booking, direct staff to use the system.
            """.formatted(
                today, today.getDayOfWeek(),
                total, occupied, available,
                deluxeRate, superRate,
                checkinsToday, checkoutsToday,
                revenue30,
                currentGuests.isEmpty() ? "None" : currentGuests,
                upcoming.isEmpty() ? "None" : upcoming);
    }

    // ── Gemini ────────────────────────────────────────────────────────────────

    private String callGemini(String context, String userMessage) {
        String body = """
            {"contents":[{"parts":[{"text":"%s\\n\\nStaff question: %s"}]}]}
            """.formatted(escape(context), escape(userMessage));

        String url = "https://generativelanguage.googleapis.com/v1beta/models/"
                   + "gemini-2.5-flash:generateContent?key=" + apiKey;
        try {
            String   response = post(url, body, null);
            JsonNode root     = mapper.readTree(response);
            if (root.has("error"))
                return "AI error: " + root.path("error").path("message").asText();
            return root.path("candidates").get(0)
                       .path("content").path("parts").get(0)
                       .path("text").asText("No response received.");
        } catch (Exception e) {
            return "AI error: " + e.getMessage();
        }
    }

    // ── OpenAI ────────────────────────────────────────────────────────────────

    private String callOpenAI(String context, String userMessage) {
        String body = """
            {"model":"gpt-4o-mini","messages":[{"role":"system","content":"%s"},{"role":"user","content":"%s"}]}
            """.formatted(escape(context), escape(userMessage));
        try {
            String   response = post("https://api.openai.com/v1/chat/completions", body, "Bearer " + apiKey);
            JsonNode root     = mapper.readTree(response);
            if (root.has("error"))
                return "AI error: " + root.path("error").path("message").asText();
            return root.path("choices").get(0)
                       .path("message").path("content").asText("No response received.");
        } catch (Exception e) {
            return "AI error: " + e.getMessage();
        }
    }

    // ── Shared ────────────────────────────────────────────────────────────────

    private String post(String url, String body, String authHeader) throws Exception {
        HttpClient client = HttpClient.newHttpClient();
        HttpRequest.Builder req = HttpRequest.newBuilder()
            .uri(URI.create(url))
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(body));
        if (authHeader != null) req.header("Authorization", authHeader);
        return client.send(req.build(), HttpResponse.BodyHandlers.ofString()).body();
    }

    private String escape(String s) {
        return s.replace("\\", "\\\\").replace("\"", "\\\"")
                .replace("\n", "\\n").replace("\r", "");
    }
}
