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

    // For departure report
    List<Reservation> findByCheckOutDateBetween(LocalDate from, LocalDate to);

    // For night audit
    List<Reservation> findByCheckInDate(LocalDate date);
    List<Reservation> findByCheckOutDate(LocalDate date);

    // For guest history lookup
    List<Reservation> findByGuestEmailIgnoreCase(String email);

    // For room detail popup — fetch active reservation for a room
    java.util.Optional<Reservation> findFirstByRoomIdAndStatusIn(Long roomId, List<ReservationStatus> statuses);

    // For checkout accounting report
    List<Reservation> findByStatusAndCheckOutDateBetween(ReservationStatus status, LocalDate from, LocalDate to);

    // For no-show report (BOOKED but check-in before a given date)
    List<Reservation> findByStatusAndCheckInDateBefore(ReservationStatus status, LocalDate date);

}
