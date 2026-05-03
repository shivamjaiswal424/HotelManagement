package com.hotel.backend.Repository;

import com.hotel.backend.Entity.PricingRecommendation;
import com.hotel.backend.Entity.RecommendationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PricingRecommendationRepository extends JpaRepository<PricingRecommendation, Long> {
    List<PricingRecommendation> findByStatusOrderByCreatedAtDesc(RecommendationStatus status);
    List<PricingRecommendation> findAllByOrderByCreatedAtDesc();
}
