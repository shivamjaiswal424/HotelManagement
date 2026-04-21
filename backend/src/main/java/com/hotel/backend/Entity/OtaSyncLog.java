package com.hotel.backend.Entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "ota_sync_logs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class OtaSyncLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String        otaName;
    private LocalDateTime syncedAt;
    private int           newBookings;
    private int           skipped;
    private String        status;  // SUCCESS | ERROR
    private String        message;
}
