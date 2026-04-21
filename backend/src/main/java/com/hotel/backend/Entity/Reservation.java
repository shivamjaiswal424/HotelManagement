package com.hotel.backend.Entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

@Entity
@Getter
@Setter
@Table(name="reservations")
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Reservation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String guestName;
    private String guestEmail;
    private String guestPhone;

    private LocalDate checkInDate;
    private LocalDate checkOutDate;

    private Integer guestsCount;
    private Double amount;

    @ManyToOne
    @JoinColumn(name="room_id")
    private Room room;

    @Enumerated(EnumType.STRING)
    private ReservationStatus status;

    @Enumerated(EnumType.STRING)
    private BookingSource source;

    @Enumerated(EnumType.STRING)
    private MealPlan mealPlan;

    @Enumerated(EnumType.STRING)
    private PaymentMode paymentMode;

    @Column(unique = true)
    private String externalBookingId; // OTA booking UID (e.g. from iCal)
}
