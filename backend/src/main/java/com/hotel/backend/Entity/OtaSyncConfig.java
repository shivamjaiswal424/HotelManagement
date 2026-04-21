package com.hotel.backend.Entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "ota_sync_configs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class OtaSyncConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String otaName;   // e.g. "Booking.com"

    @Column(length = 1024)
    private String icalUrl;

    @Enumerated(EnumType.STRING)
    private RoomType roomType; // which room type OTA bookings map to

    private boolean enabled;

    private LocalDateTime lastSyncAt;
    private String        lastSyncStatus; // SUCCESS | ERROR | null
}
