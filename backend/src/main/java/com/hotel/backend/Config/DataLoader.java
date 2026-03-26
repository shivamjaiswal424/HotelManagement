package com.hotel.backend.Config;

import com.hotel.backend.Entity.*;
import com.hotel.backend.Repository.RatePlanRepository;
import com.hotel.backend.Repository.ReservationRepository;
import com.hotel.backend.Repository.RoomRepository;
import com.hotel.backend.Repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class DataLoader implements CommandLineRunner {

    private final RoomRepository roomRepository;
    private final RatePlanRepository ratePlanRepository;
    private final ReservationRepository reservationRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.admin.username:admin}")
    private String adminUsername;

    @Value("${app.admin.password:admin123}")
    private String adminPassword;

    @Value("${app.admin.fullname:Hotel Administrator}")
    private String adminFullName;

    /**
     * Set app.seed.reset=true once to clear all rooms/reservations and reload demo data.
     * After the first run, set it back to false to prevent data loss on restart.
     */
    @Value("${app.seed.reset:false}")
    private boolean resetSeed;

    @Override
    public void run(String... args) {
        if (resetSeed) {
            reservationRepository.deleteAll();
            roomRepository.deleteAll();
        }
        seedRooms();
        seedRatePlans();
        seedAdminUser();
        if (resetSeed) {
            seedDemoReservations();
        }
    }

    private void seedRooms() {
        if (roomRepository.count() > 0) return;

        List<Room> rooms = new ArrayList<>();

        // 20 Deluxe rooms — floor 1 (101–110) and floor 2 (201–210)
        for (int i = 1; i <= 10; i++) {
            rooms.add(Room.builder()
                    .roomNumber("1" + String.format("%02d", i))
                    .roomType(RoomType.DELUXE)
                    .roomStatus(RoomStatus.AVAILABLE)
                    .basePrice(1800.0)
                    .build());
        }
        for (int i = 1; i <= 10; i++) {
            rooms.add(Room.builder()
                    .roomNumber("2" + String.format("%02d", i))
                    .roomType(RoomType.DELUXE)
                    .roomStatus(RoomStatus.AVAILABLE)
                    .basePrice(1800.0)
                    .build());
        }

        // 10 Super Deluxe rooms — floor 3 (301–310)
        for (int i = 1; i <= 10; i++) {
            rooms.add(Room.builder()
                    .roomNumber("3" + String.format("%02d", i))
                    .roomType(RoomType.SUPER_DELUXE)
                    .roomStatus(RoomStatus.AVAILABLE)
                    .basePrice(3200.0)
                    .build());
        }

        roomRepository.saveAll(rooms);
    }

    private void seedRatePlans() {
        if (ratePlanRepository.count() > 0) return;
        ratePlanRepository.saveAll(List.of(
                RatePlan.builder().name("Deluxe CP").roomType(RoomType.DELUXE).mealPlan("CP").category("CORP").build(),
                RatePlan.builder().name("Deluxe EP").roomType(RoomType.DELUXE).mealPlan("EP").category("OTA").build(),
                RatePlan.builder().name("Super Deluxe CP").roomType(RoomType.SUPER_DELUXE).mealPlan("CP").category("CORP").build(),
                RatePlan.builder().name("Super Deluxe EP").roomType(RoomType.SUPER_DELUXE).mealPlan("EP").category("OTA").build()
        ));
    }

    private void seedAdminUser() {
        if (userRepository.findByUsername(adminUsername).isPresent()) return;
        userRepository.save(User.builder()
                .username(adminUsername)
                .password(passwordEncoder.encode(adminPassword))
                .fullName(adminFullName)
                .role(UserRole.ADMIN)
                .build());
    }

    private void seedDemoReservations() {
        if (reservationRepository.count() > 0) return;

        List<Room> allRooms = roomRepository.findAll();
        List<Room> deluxeRooms = allRooms.stream()
                .filter(r -> r.getRoomType() == RoomType.DELUXE)
                .sorted((a, b) -> a.getRoomNumber().compareTo(b.getRoomNumber()))
                .collect(Collectors.toList());
        List<Room> sdRooms = allRooms.stream()
                .filter(r -> r.getRoomType() == RoomType.SUPER_DELUXE)
                .sorted((a, b) -> a.getRoomNumber().compareTo(b.getRoomNumber()))
                .collect(Collectors.toList());

        LocalDate today = LocalDate.now();
        List<Reservation> reservations = new ArrayList<>();

        // ── Past CHECKED_OUT reservations (3 months of analytics data) ──────────
        Object[][] pastData = {
            {"Rajesh Kumar",     "rajesh.kumar@gmail.com",    "+91 98765 43210", 85, 3, deluxeRooms.get(0),  1},
            {"Priya Sharma",     "priya.sharma@yahoo.com",    "+91 87654 32109", 78, 2, deluxeRooms.get(2),  2},
            {"Amit Singh",       "amit.singh@outlook.com",    "+91 76543 21098", 71, 4, sdRooms.get(0),      1},
            {"Sunita Patel",     "sunita.patel@gmail.com",    "+91 90123 45678", 64, 2, deluxeRooms.get(4),  3},
            {"Vikram Mehta",     "vikram.mehta@company.in",   "+91 91234 56789", 60, 3, deluxeRooms.get(6),  2},
            {"Deepika Iyer",     "deepika.iyer@gmail.com",    "+91 82345 67890", 55, 5, sdRooms.get(1),      1},
            {"Sanjay Gupta",     "sanjay.gupta@hotmail.com",  "+91 93456 78901", 49, 2, deluxeRooms.get(8),  2},
            {"Kavita Nair",      "kavita.nair@gmail.com",     "+91 84567 89012", 43, 3, deluxeRooms.get(10), 3},
            {"Arun Mishra",      "arun.mishra@gmail.com",     "+91 95678 90123", 36, 4, sdRooms.get(2),      2},
            {"Lakshmi Rao",      "lakshmi.rao@gmail.com",     "+91 86789 01234", 30, 2, deluxeRooms.get(12), 1},
            {"Rahul Verma",      "rahul.verma@company.com",   "+91 97890 12345", 25, 3, deluxeRooms.get(14), 2},
            {"Anita Joshi",      "anita.joshi@gmail.com",     "+91 88901 23456", 21, 2, sdRooms.get(3),      1},
            {"Suresh Bhat",      "suresh.bhat@yahoo.in",      "+91 99012 34567", 14, 4, deluxeRooms.get(16), 3},
            {"Pooja Agarwal",    "pooja.agarwal@gmail.com",   "+91 80123 45678", 10, 3, deluxeRooms.get(18), 2},
            {"Nikhil Reddy",     "nikhil.reddy@outlook.in",   "+91 91234 56780",  7, 2, sdRooms.get(4),      1},
            {"Meera Srivastava", "meera.s@gmail.com",         "+91 83456 78900",  5, 3, deluxeRooms.get(1),  2},
            {"Farhan Mirza",     "farhan.mirza@company.in",   "+91 94567 89010",  4, 2, sdRooms.get(5),      1},
        };

        for (Object[] row : pastData) {
            LocalDate co = today.minusDays((int) row[3]);
            LocalDate ci = co.minusDays((int) row[4]);
            Room room = (Room) row[5];
            double amount = room.getBasePrice() * (int) row[4];
            reservations.add(Reservation.builder()
                    .guestName((String) row[0])
                    .guestEmail((String) row[1])
                    .guestPhone((String) row[2])
                    .checkInDate(ci).checkOutDate(co)
                    .guestsCount((int) row[6])
                    .amount(amount)
                    .room(room)
                    .status(ReservationStatus.CHECKED_OUT)
                    .build());
        }

        // ── Current CHECKED_IN guests (16 Deluxe + 7 Super Deluxe = 77% occupancy) ─
        Object[][] currentData = {
            // guestName, email, phone, checkedInDaysAgo, checkoutInDays, room, guestsCount
            {"Arjun Kapoor",    "arjun.kapoor@company.in",   "+91 83456 78901", 5, 2, deluxeRooms.get(0),  2},
            {"Sneha Chopra",    "sneha.chopra@gmail.com",    "+91 94567 89012", 3, 3, deluxeRooms.get(1),  1},
            {"Ravi Tiwari",     "ravi.tiwari@gmail.com",     "+91 85678 90123", 4, 1, deluxeRooms.get(2),  3},
            {"Anjali Bhatt",    "anjali.bhatt@yahoo.in",     "+91 96789 01234", 2, 4, deluxeRooms.get(3),  2},
            {"Manoj Kumar",     "manoj.kumar@gmail.com",     "+91 87890 12345", 6, 1, deluxeRooms.get(4),  1},
            {"Divya Singh",     "divya.singh@outlook.com",   "+91 98901 23456", 1, 5, deluxeRooms.get(5),  2},
            {"Kiran Yadav",     "kiran.yadav@gmail.com",     "+91 89012 34567", 3, 2, deluxeRooms.get(6),  3},
            {"Rohit Sharma",    "rohit.sharma@company.in",   "+91 90123 45679", 4, 3, deluxeRooms.get(7),  1},
            {"Swati Malhotra",  "swati.malhotra@gmail.com",  "+91 81234 56789", 2, 1, deluxeRooms.get(8),  2},
            {"Dinesh Pillai",   "dinesh.pillai@gmail.com",   "+91 92345 67891", 5, 4, deluxeRooms.get(9),  1},
            {"Nisha Choudhary", "nisha.choudhary@yahoo.com", "+91 83456 78902", 3, 2, deluxeRooms.get(10), 3},
            {"Ajay Bansal",     "ajay.bansal@company.in",    "+91 94567 89013", 1, 3, deluxeRooms.get(11), 2},
            {"Smita Desai",     "smita.desai@gmail.com",     "+91 85678 90124", 4, 2, deluxeRooms.get(12), 1},
            {"Prakash Goswami", "prakash.goswami@gmail.com", "+91 96789 01235", 6, 1, deluxeRooms.get(13), 2},
            {"Varun Shah",      "varun.shah@outlook.in",     "+91 87890 12346", 2, 4, deluxeRooms.get(14), 1},
            {"Preethi Menon",   "preethi.menon@gmail.com",   "+91 98901 23458", 3, 3, deluxeRooms.get(15), 3},
            // Super Deluxe
            {"Rina Sinha",      "rina.sinha@gmail.com",      "+91 89012 34568", 4, 3, sdRooms.get(0),      2},
            {"Tarun Saxena",    "tarun.saxena@company.com",  "+91 90123 45680", 2, 5, sdRooms.get(1),      1},
            {"Pallavi Dixit",   "pallavi.dixit@gmail.com",   "+91 81234 56790", 5, 2, sdRooms.get(2),      3},
            {"Harish Rao",      "harish.rao@gmail.com",      "+91 92345 67892", 3, 4, sdRooms.get(3),      2},
            {"Gita Pandey",     "gita.pandey@yahoo.in",      "+91 83456 78903", 1, 3, sdRooms.get(4),      1},
            {"Jayesh Bose",     "jayesh.bose@company.in",    "+91 94567 89014", 4, 2, sdRooms.get(5),      2},
            {"Chetan Malviya",  "chetan.malviya@gmail.com",  "+91 85678 90125", 2, 5, sdRooms.get(6),      1},
        };

        for (Object[] row : currentData) {
            LocalDate ci = today.minusDays((int) row[3]);
            LocalDate co = today.plusDays((int) row[4]);
            Room room = (Room) row[5];
            int nights = (int) (co.toEpochDay() - ci.toEpochDay());
            double amount = room.getBasePrice() * nights;

            reservations.add(Reservation.builder()
                    .guestName((String) row[0])
                    .guestEmail((String) row[1])
                    .guestPhone((String) row[2])
                    .checkInDate(ci).checkOutDate(co)
                    .guestsCount((int) row[6])
                    .amount(amount)
                    .room(room)
                    .status(ReservationStatus.CHECKED_IN)
                    .build());
            room.setRoomStatus(RoomStatus.OCCUPIED);
            roomRepository.save(room);
        }

        // ── Upcoming BOOKED reservations ─────────────────────────────────────────
        Object[][] upcomingData = {
            {"Sundar Krishnan",    "sundar.k@gmail.com",      "+91 95678 90124", 1, 3, deluxeRooms.get(16), 2},
            {"Rekha Pillai",       "rekha.pillai@yahoo.in",   "+91 86789 01235", 2, 4, deluxeRooms.get(17), 1},
            {"Kavya Nambiar",      "kavya.n@gmail.com",       "+91 97890 12346", 1, 2, sdRooms.get(7),      3},
            {"Preeti Srivastava",  "preeti.s@outlook.in",     "+91 88901 23457", 3, 5, sdRooms.get(8),      2},
        };

        for (Object[] row : upcomingData) {
            LocalDate ci = today.plusDays((int) row[3]);
            LocalDate co = ci.plusDays((int) row[4]);
            Room room = (Room) row[5];
            double amount = room.getBasePrice() * (int) row[4];

            reservations.add(Reservation.builder()
                    .guestName((String) row[0])
                    .guestEmail((String) row[1])
                    .guestPhone((String) row[2])
                    .checkInDate(ci).checkOutDate(co)
                    .guestsCount((int) row[6])
                    .amount(amount)
                    .room(room)
                    .status(ReservationStatus.BOOKED)
                    .build());
            room.setRoomStatus(RoomStatus.OCCUPIED);
            roomRepository.save(room);
        }

        reservationRepository.saveAll(reservations);
    }
}
