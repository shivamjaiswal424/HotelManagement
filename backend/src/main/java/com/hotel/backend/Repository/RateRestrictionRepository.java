package com.hotel.backend.Repository;

import com.hotel.backend.Entity.RateRestriction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.Optional;

public interface RateRestrictionRepository extends JpaRepository<RateRestriction, Long> {
    Optional<RateRestriction> findByRatePlanIdAndDate(Long ratePlanId, LocalDate date);
}
