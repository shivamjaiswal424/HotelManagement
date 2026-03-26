package com.hotel.backend.Repository;

import com.hotel.backend.Entity.Reservation;
import com.hotel.backend.Entity.ReservationStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface ReservationRepository extends JpaRepository<Reservation, Long> {
    List<Reservation> findByStatus(ReservationStatus status);

    // For stay view: reservations overlapping [fromDate, toDate]
    List<Reservation> findByCheckInDateLessThanEqualAndCheckOutDateGreaterThan(
            LocalDate toDate, LocalDate fromDate);

    // For analytics: reservations with check-in in a date range
    List<Reservation> findByCheckInDateBetween(LocalDate from, LocalDate to);
}
