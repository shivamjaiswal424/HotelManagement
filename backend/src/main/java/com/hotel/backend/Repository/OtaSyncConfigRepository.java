package com.hotel.backend.Repository;

import com.hotel.backend.Entity.OtaSyncConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface OtaSyncConfigRepository extends JpaRepository<OtaSyncConfig, Long> {
    List<OtaSyncConfig> findByEnabledTrue();
}
