package com.hotel.backend.Service;

import com.hotel.backend.Entity.InventoryCalendar;
import com.hotel.backend.Entity.RateCalendar;
import com.hotel.backend.Entity.RoomType;
import com.hotel.backend.Repository.InventoryCalendarRepository;
import com.hotel.backend.Repository.RateCalendarRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class BulkUpdateService {

    private final InventoryCalendarRepository inventoryRepo;
    private final RateCalendarRepository rateRepo;

    @Transactional
    public void bulkUpdateInventory(
            List<RoomType> roomTypes,
            LocalDate from,
            LocalDate to,
            List<Integer> weekdays,
            Integer inventoryValue){

        List<InventoryCalendar> toSave = new ArrayList<>();

        LocalDate d = from;

        while(!d.isAfter(to)){

            if(weekdays.contains(d.getDayOfWeek().getValue())){

                for(RoomType rt : roomTypes){

                    InventoryCalendar record =
                            inventoryRepo.findByRoomTypeAndDate(rt,d)
                                    .orElse(
                                            InventoryCalendar.builder()
                                                    .roomType(rt)
                                                    .date(d)
                                                    .build()
                                    );

                    record.setAvailableRooms(inventoryValue);
                    toSave.add(record);
                }
            }

            d = d.plusDays(1);
        }

        inventoryRepo.saveAll(toSave);
    }

    @Transactional
    public void bulkUpdateRate(
            List<Long> ratePlanIds,
            LocalDate from,
            LocalDate to,
            List<Integer> weekdays,
            Double rateValue){

        List<RateCalendar> toSave = new ArrayList<>();

        LocalDate d = from;

        while(!d.isAfter(to)){

            if(weekdays.contains(d.getDayOfWeek().getValue())){

                for(Long ratePlanId : ratePlanIds){

                    RateCalendar record =
                            rateRepo.findByRatePlanIdAndDate(ratePlanId,d)
                                    .orElse(
                                            RateCalendar.builder()
                                                    .ratePlanId(ratePlanId)
                                                    .date(d)
                                                    .build()
                                    );

                    record.setRate(rateValue);
                    toSave.add(record);
                }
            }

            d = d.plusDays(1);
        }

        rateRepo.saveAll(toSave);
    }
}

