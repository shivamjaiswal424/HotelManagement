package com.hotel.backend.Repository;

import com.hotel.backend.Entity.ServiceCharge;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ServiceChargeRepository extends JpaRepository<ServiceCharge, Long> {
    List<ServiceCharge> findByReservationId(Long reservationId);
}
