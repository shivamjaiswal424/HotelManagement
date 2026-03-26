package com.hotel.backend.Entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "rate_plans")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RatePlan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Example: "Deluxe Room S CP"
    private String name;

    @Enumerated(EnumType.STRING)
    private RoomType roomType;


    // Example: "CP", "EP"
    private String mealPlan;

    // Example: "CORP", "OTA"
    private String category;
}
