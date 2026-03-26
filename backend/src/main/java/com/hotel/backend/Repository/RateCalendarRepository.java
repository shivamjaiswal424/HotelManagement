package com.hotel.backend.Repository;


import com.hotel.backend.Entity.RateCalendar;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface RateCalendarRepository extends JpaRepository<RateCalendar, Long> {

    List<RateCalendar> findByDateBetween(LocalDate from, LocalDate to);

    Optional<RateCalendar> findByRatePlanIdAndDate(Long ratePlanId, LocalDate date);
}