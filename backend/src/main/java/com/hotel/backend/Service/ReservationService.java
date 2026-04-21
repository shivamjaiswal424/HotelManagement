package com.hotel.backend.Service;

import com.hotel.backend.DTO.InvoiceResponse;
import com.hotel.backend.Entity.*;
import com.hotel.backend.Repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class ReservationService {
    private final ReservationRepository reservationRepository;
    private final RoomRepository roomRepository;
    private final ServiceChargeRepository serviceChargeRepository;
    private final PaymentRepository paymentRepository;

    public List<Reservation> getAllReservations() {
        return reservationRepository.findAll();
    }

    public Optional<Reservation> getActiveByRoom(Long roomId) {
        return reservationRepository.findFirstByRoomIdAndStatusIn(
                roomId, List.of(ReservationStatus.BOOKED, ReservationStatus.CHECKED_IN));
    }

    public Reservation createReservation(Reservation reservation, Long roomId) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new RuntimeException("Room not found"));
        if (room.getRoomStatus() != RoomStatus.AVAILABLE) {
            throw new RuntimeException("Room status is not AVAILABLE");
        }
        reservation.setRoom(room);
        reservation.setStatus(ReservationStatus.BOOKED);
        room.setRoomStatus(RoomStatus.OCCUPIED);
        roomRepository.save(room);
        return reservationRepository.save(reservation);
    }

    public Reservation checkIn(Long reservationId) {
        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new RuntimeException("Reservation not found"));
        if (LocalDate.now().isBefore(reservation.getCheckInDate())) {
            throw new RuntimeException(
                "Cannot check in before the scheduled check-in date (" + reservation.getCheckInDate() + ")");
        }
        reservation.setStatus(ReservationStatus.CHECKED_IN);
        return reservationRepository.save(reservation);
    }

    public Reservation checkOut(Long reservationId) {
        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new RuntimeException("Reservation not found"));
        reservation.setStatus(ReservationStatus.CHECKED_OUT);
        Room room = reservation.getRoom();
        room.setRoomStatus(RoomStatus.AVAILABLE);
        roomRepository.save(room);
        return reservationRepository.save(reservation);
    }

    public Reservation updateReservation(Long id, Reservation updates) {
        Reservation r = reservationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Reservation not found"));
        if (updates.getCheckInDate() != null)  r.setCheckInDate(updates.getCheckInDate());
        if (updates.getCheckOutDate() != null) r.setCheckOutDate(updates.getCheckOutDate());
        if (updates.getGuestsCount() != null)  r.setGuestsCount(updates.getGuestsCount());
        if (updates.getSource() != null)       r.setSource(updates.getSource());
        if (updates.getMealPlan() != null)     r.setMealPlan(updates.getMealPlan());
        if (updates.getPaymentMode() != null)  r.setPaymentMode(updates.getPaymentMode());
        if (updates.getAmount() != null)       r.setAmount(updates.getAmount());
        return reservationRepository.save(r);
    }

    public ServiceCharge addServiceCharge(Long reservationId, ServiceCharge charge) {
        Reservation r = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new RuntimeException("Reservation not found"));
        charge.setReservation(r);
        if (charge.getChargeDate() == null) charge.setChargeDate(LocalDate.now());
        return serviceChargeRepository.save(charge);
    }

    public List<ServiceCharge> getServiceCharges(Long reservationId) {
        return serviceChargeRepository.findByReservationId(reservationId);
    }

    public Payment addPayment(Long reservationId, Payment payment) {
        Reservation r = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new RuntimeException("Reservation not found"));
        payment.setReservation(r);
        if (payment.getPaymentDate() == null) payment.setPaymentDate(LocalDate.now());
        return paymentRepository.save(payment);
    }

    public List<Payment> getPayments(Long reservationId) {
        return paymentRepository.findByReservationId(reservationId);
    }

    public InvoiceResponse getInvoice(Long reservationId) {
        Reservation r = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new RuntimeException("Reservation not found"));
        List<ServiceCharge> services = serviceChargeRepository.findByReservationId(reservationId);
        List<Payment> payments       = paymentRepository.findByReservationId(reservationId);

        double roomCharges  = r.getAmount() != null ? r.getAmount() : 0;
        double serviceTotal = services.stream().mapToDouble(ServiceCharge::getAmount).sum();
        double totalCharges = roomCharges + serviceTotal;
        double totalPaid    = payments.stream().mapToDouble(Payment::getAmount).sum();
        int nights          = (int) (r.getCheckOutDate().toEpochDay() - r.getCheckInDate().toEpochDay());

        return InvoiceResponse.builder()
                .reservationId(r.getId())
                .guestName(r.getGuestName())
                .guestEmail(r.getGuestEmail())
                .guestPhone(r.getGuestPhone())
                .roomNumber(r.getRoom() != null ? r.getRoom().getRoomNumber() : "-")
                .roomType(r.getRoom() != null ? r.getRoom().getRoomType().name() : "-")
                .checkInDate(r.getCheckInDate())
                .checkOutDate(r.getCheckOutDate())
                .nights(nights)
                .guestsCount(r.getGuestsCount() != null ? r.getGuestsCount() : 1)
                .mealPlan(r.getMealPlan() != null ? r.getMealPlan().name() : null)
                .source(r.getSource() != null ? r.getSource().name() : null)
                .paymentMode(r.getPaymentMode() != null ? r.getPaymentMode().name() : null)
                .roomCharges(roomCharges)
                .services(services)
                .payments(payments)
                .totalCharges(totalCharges)
                .totalPaid(totalPaid)
                .balance(totalCharges - totalPaid)
                .build();
    }

    public Reservation exchangeRoom(Long reservationId, Long newRoomId) {
        Reservation r = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new RuntimeException("Reservation not found"));
        Room newRoom = roomRepository.findById(newRoomId)
                .orElseThrow(() -> new RuntimeException("Target room not found"));
        if (newRoom.getRoomStatus() != RoomStatus.AVAILABLE) {
            throw new RuntimeException("Target room is not available");
        }
        Room oldRoom = r.getRoom();
        if (oldRoom != null) {
            oldRoom.setRoomStatus(RoomStatus.AVAILABLE);
            roomRepository.save(oldRoom);
        }
        newRoom.setRoomStatus(RoomStatus.OCCUPIED);
        roomRepository.save(newRoom);
        r.setRoom(newRoom);
        return reservationRepository.save(r);
    }
}
