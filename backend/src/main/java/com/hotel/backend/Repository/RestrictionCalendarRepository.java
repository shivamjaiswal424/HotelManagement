package com.hotel.backend.Repository;

import com.hotel.backend.Entity.RestrictionCalendar;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.Optional;

public interface RestrictionCalendarRepository extends JpaRepository<RestrictionCalendar, Long> {
    Optional<RestrictionCalendar> findByScopeAndScopeKeyAndDate(String scope, String scopeKey, LocalDate date);
}