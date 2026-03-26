package com.hotel.backend.Repository;


import com.hotel.backend.Entity.Guest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface GuestRepository extends JpaRepository<Guest, Long> {
    List<Guest> findByNameContainingIgnoreCase(String name);
}