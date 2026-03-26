package com.hotel.backend.Entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

@Entity
@Table(name="rate_calendar",
        uniqueConstraints=@UniqueConstraint(columnNames={"ratePlanId","date"}))

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RateCalendar {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long ratePlanId;

    private LocalDate date;

    private Double rate;
}
