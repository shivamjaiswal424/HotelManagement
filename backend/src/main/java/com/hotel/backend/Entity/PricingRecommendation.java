package com.hotel.backend.Entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "pricing_recommendations")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class PricingRecommendation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    private RoomType roomType;

    private LocalDate forDate;
    private Double currentRate;
    private Double suggestedRate;

    @Column(length = 1000)
    private String reason;

    @Enumerated(EnumType.STRING)
    private RecommendationStatus status;

    private LocalDateTime createdAt;
}
