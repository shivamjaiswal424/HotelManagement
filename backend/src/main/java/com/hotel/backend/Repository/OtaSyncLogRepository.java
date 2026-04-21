package com.hotel.backend.Repository;

import com.hotel.backend.Entity.OtaSyncLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Pageable;
import java.util.List;

public interface OtaSyncLogRepository extends JpaRepository<OtaSyncLog, Long> {
    List<OtaSyncLog> findAllByOrderBySyncedAtDesc(Pageable pageable);
}
