package com.hotel.backend.Service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotel.backend.Entity.*;
import com.hotel.backend.Repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class PricingService {

    private final RoomRepository                  roomRepository;
    private final ReservationRepository           reservationRepository;
    private final PricingRecommendationRepository recommendationRepository;
    private final ObjectMapper                    mapper = new ObjectMapper();

    @Value("${app.ai.key}")             private String apiKey;
    @Value("${app.ai.provider:gemini}") private String provider;

    // ── Run every day at 8:00 AM ──────────────────────────────────────────────

    @Scheduled(cron = "0 0 8 * * *")
    public void generateDailyRecommendations() {
        log.info("Running daily pricing recommendations...");
        generate();
    }

    // ── Manual trigger from controller ────────────────────────────────────────

    public List<PricingRecommendation> generate() {
        LocalDate today = LocalDate.now();

        // Occupancy for next 7 days per room type
        long totalDeluxe      = roomRepository.findAll().stream()
            .filter(r -> r.getRoomType() == RoomType.DELUXE).count();
        long totalSuperDeluxe = roomRepository.findAll().stream()
            .filter(r -> r.getRoomType() == RoomType.SUPER_DELUXE).count();

        double deluxePrice      = roomRepository.findAll().stream()
            .filter(r -> r.getRoomType() == RoomType.DELUXE)
            .mapToDouble(Room::getBasePrice).average().orElse(1800);
        double superDeluxePrice = roomRepository.findAll().stream()
            .filter(r -> r.getRoomType() == RoomType.SUPER_DELUXE)
            .mapToDouble(Room::getBasePrice).average().orElse(3200);

        // Count occupied per type for next 7 days
        long deluxeOccupied = reservationRepository
            .findByCheckInDateLessThanEqualAndCheckOutDateGreaterThan(today.plusDays(7), today)
            .stream()
            .filter(r -> r.getStatus() == ReservationStatus.BOOKED
                      || r.getStatus() == ReservationStatus.CHECKED_IN)
            .filter(r -> r.getRoom() != null && r.getRoom().getRoomType() == RoomType.DELUXE)
            .count();

        long superDeluxeOccupied = reservationRepository
            .findByCheckInDateLessThanEqualAndCheckOutDateGreaterThan(today.plusDays(7), today)
            .stream()
            .filter(r -> r.getStatus() == ReservationStatus.BOOKED
                      || r.getStatus() == ReservationStatus.CHECKED_IN)
            .filter(r -> r.getRoom() != null && r.getRoom().getRoomType() == RoomType.SUPER_DELUXE)
            .count();

        int deluxeOccupancyPct      = totalDeluxe > 0 ? (int)(deluxeOccupied * 100 / totalDeluxe) : 0;
        int superDeluxeOccupancyPct = totalSuperDeluxe > 0 ? (int)(superDeluxeOccupied * 100 / totalSuperDeluxe) : 0;

        // Past 30 days revenue
        double recentRevenue = reservationRepository
            .findByCheckInDateBetween(today.minusDays(30), today)
            .stream().mapToDouble(r -> r.getAmount() != null ? r.getAmount() : 0).sum();

        String prompt = """
            You are a hotel revenue manager for Annapurna Banquets and Inn.
            Analyze the data below and suggest optimal room rates for the next 7 days.

            TODAY: %s (%s)

            DELUXE ROOMS:
            - Current rate: ₹%.0f/night
            - Occupancy next 7 days: %d%%

            SUPER DELUXE ROOMS:
            - Current rate: ₹%.0f/night
            - Occupancy next 7 days: %d%%

            Past 30 days revenue: ₹%.0f

            Rules:
            - If occupancy > 80%%: suggest increasing rate by 10-20%%
            - If occupancy 50-80%%: keep rate or increase by 5%%
            - If occupancy < 50%%: suggest decreasing rate by 5-10%% to attract guests
            - Consider day of week (weekends can be higher)
            - Keep rates reasonable for a mid-range Indian hotel

            Respond ONLY with a valid JSON array, no explanation, no markdown:
            [
              {"roomType":"DELUXE","suggestedRate":2000,"reason":"Short reason here"},
              {"roomType":"SUPER_DELUXE","suggestedRate":3500,"reason":"Short reason here"}
            ]
            """.formatted(today, today.getDayOfWeek(),
                          deluxePrice, deluxeOccupancyPct,
                          superDeluxePrice, superDeluxeOccupancyPct,
                          recentRevenue);

        try {
            String aiResponse = callAI(prompt);
            // Strip markdown code fences if present
            String json = aiResponse.replaceAll("```json\\s*", "").replaceAll("```\\s*", "").trim();
            JsonNode arr = mapper.readTree(json);

            recommendationRepository.deleteAll(
                recommendationRepository.findByStatusOrderByCreatedAtDesc(RecommendationStatus.PENDING)
            );

            for (JsonNode node : arr) {
                String rt = node.path("roomType").asText();
                double suggested = node.path("suggestedRate").asDouble();
                String reason    = node.path("reason").asText();
                if (suggested <= 0) continue;

                RoomType roomType = rt.equals("SUPER_DELUXE") ? RoomType.SUPER_DELUXE : RoomType.DELUXE;
                double current   = roomType == RoomType.DELUXE ? deluxePrice : superDeluxePrice;

                recommendationRepository.save(PricingRecommendation.builder()
                    .roomType(roomType)
                    .forDate(today)
                    .currentRate(current)
                    .suggestedRate(suggested)
                    .reason(reason)
                    .status(RecommendationStatus.PENDING)
                    .createdAt(LocalDateTime.now())
                    .build());
            }
        } catch (Exception e) {
            log.error("Pricing AI error: {}", e.getMessage());
        }

        return recommendationRepository.findByStatusOrderByCreatedAtDesc(RecommendationStatus.PENDING);
    }

    // ── Apply approved rate to all rooms of that type ─────────────────────────

    public void applyRate(PricingRecommendation rec) {
        roomRepository.findAll().stream()
            .filter(r -> r.getRoomType() == rec.getRoomType())
            .forEach(r -> {
                r.setBasePrice(rec.getSuggestedRate());
                roomRepository.save(r);
            });
    }

    // ── AI call ───────────────────────────────────────────────────────────────

    private String callAI(String prompt) throws Exception {
        String body = """
            {"contents":[{"parts":[{"text":"%s"}]}]}
            """.formatted(prompt.replace("\\", "\\\\").replace("\"", "\\\"")
                               .replace("\n", "\\n").replace("\r", ""));

        String url = "https://generativelanguage.googleapis.com/v1beta/models/"
                   + "gemini-2.5-flash:generateContent?key=" + apiKey;

        HttpClient client = HttpClient.newHttpClient();
        HttpRequest req   = HttpRequest.newBuilder()
            .uri(URI.create(url))
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(body))
            .build();
        HttpResponse<String> res = client.send(req, HttpResponse.BodyHandlers.ofString());

        JsonNode root = mapper.readTree(res.body());
        if (root.has("error")) throw new RuntimeException(root.path("error").path("message").asText());
        return root.path("candidates").get(0)
                   .path("content").path("parts").get(0)
                   .path("text").asText();
    }
}
