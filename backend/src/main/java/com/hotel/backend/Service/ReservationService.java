package com.hotel.backend.Service;

import com.hotel.backend.Entity.Reservation;
import com.hotel.backend.Entity.ReservationStatus;
import com.hotel.backend.Entity.Room;
import com.hotel.backend.Entity.RoomStatus;
import com.hotel.backend.Repository.ReservationRepository;
import com.hotel.backend.Repository.RoomRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ReservationService {
    private final ReservationRepository reservationRepository;
    private final RoomRepository roomRepository;

    public List<Reservation> findByRoomId(Long roomId) {
        return reservationRepository.findAll();
    }

    public List<Reservation> getAllReservations() {
        return reservationRepository.findAll();
    }
    public Reservation createReservation(Reservation reservation,Long roomId) {
        Room room = roomRepository.findById(roomId).orElseThrow(() -> new RuntimeException("Room not found"));
        if(room.getRoomStatus()!= RoomStatus.AVAILABLE){
            throw new RuntimeException("Room status is not AVAILABLE");
        }
        reservation.setRoom(room);
        reservation.setStatus(ReservationStatus.BOOKED);

        room.setRoomStatus(RoomStatus.OCCUPIED);
        roomRepository.save(room);
        return reservationRepository.save(reservation);
    }

    public Reservation checkIn(Long reservationId){
        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new RuntimeException("Reservation not found"));
        if (LocalDate.now().isBefore(reservation.getCheckInDate())) {
            throw new RuntimeException(
                "Cannot check in before the scheduled check-in date (" + reservation.getCheckInDate() + ")");
        }
        reservation.setStatus(ReservationStatus.CHECKED_IN);
        return reservationRepository.save(reservation);
    }

    public Reservation checkOut(Long reservationId){
        Reservation reservation = reservationRepository.findById(reservationId).orElseThrow(() -> new RuntimeException("Reservation not found"));

        reservation.setStatus(ReservationStatus.CHECKED_OUT);
        Room room = reservation.getRoom();
        room.setRoomStatus(RoomStatus.AVAILABLE);
        roomRepository.save(room);
        return reservationRepository.save(reservation);
    }
}
