package com.hotel.backend.Controllers;

import com.hotel.backend.Entity.PricingRecommendation;
import com.hotel.backend.Entity.RecommendationStatus;
import com.hotel.backend.Repository.PricingRecommendationRepository;
import com.hotel.backend.Service.PricingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/pricing")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class PricingController {

    private final PricingService                  pricingService;
    private final PricingRecommendationRepository repository;

    @GetMapping("/recommendations")
    public List<PricingRecommendation> getPending() {
        return repository.findByStatusOrderByCreatedAtDesc(RecommendationStatus.PENDING);
    }

    @GetMapping("/recommendations/all")
    public List<PricingRecommendation> getAll() {
        return repository.findAllByOrderByCreatedAtDesc();
    }

    @PostMapping("/generate")
    public List<PricingRecommendation> generate() {
        return pricingService.generate();
    }

    @PutMapping("/recommendations/{id}/approve")
    public ResponseEntity<?> approve(@PathVariable Long id) {
        return repository.findById(id).map(rec -> {
            pricingService.applyRate(rec);
            rec.setStatus(RecommendationStatus.APPROVED);
            repository.save(rec);
            return ResponseEntity.ok(Map.of("message", "Rate applied successfully"));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/recommendations/{id}/dismiss")
    public ResponseEntity<?> dismiss(@PathVariable Long id) {
        return repository.findById(id).map(rec -> {
            rec.setStatus(RecommendationStatus.DISMISSED);
            repository.save(rec);
            return ResponseEntity.ok(Map.of("message", "Recommendation dismissed"));
        }).orElse(ResponseEntity.notFound().build());
    }
}
