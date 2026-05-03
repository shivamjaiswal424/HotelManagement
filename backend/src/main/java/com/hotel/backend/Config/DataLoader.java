package com.hotel.backend.Config;

import com.hotel.backend.Entity.*;
import com.hotel.backend.Repository.*;
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

    private final RoomRepository           roomRepository;
    private final ReservationRepository    reservationRepository;
    private final ServiceChargeRepository  serviceChargeRepository;
    private final PaymentRepository        paymentRepository;
    private final UserRepository           userRepository;
    private final PasswordEncoder          passwordEncoder;

    @Value("${app.admin.username:admin}")   private String adminUsername;
    @Value("${app.admin.password:admin123}") private String adminPassword;
    @Value("${app.admin.fullname:Hotel Administrator}") private String adminFullName;
    @Value("${app.seed.reset:false}")       private boolean resetSeed;

    @Override
    public void run(String... args) {
        if (resetSeed) {
            // Delete in FK-safe order: child tables first, then parent tables
            serviceChargeRepository.deleteAll();
            paymentRepository.deleteAll();
            reservationRepository.deleteAll();
            roomRepository.deleteAll();
        }
        seedRooms();
        seedAdminUser();
        if (resetSeed) {
            seedDemoReservations();
        }
    }

    // ── Rooms ────────────────────────────────────────────────────────────────────
    private void seedRooms() {
        if (roomRepository.count() > 0) return;
        List<Room> rooms = new ArrayList<>();
        for (int i = 1; i <= 10; i++)
            rooms.add(room("1" + String.format("%02d", i), RoomType.DELUXE,       1800.0));
        for (int i = 1; i <= 10; i++)
            rooms.add(room("2" + String.format("%02d", i), RoomType.DELUXE,       1800.0));
        for (int i = 1; i <= 10; i++)
            rooms.add(room("3" + String.format("%02d", i), RoomType.SUPER_DELUXE, 3200.0));
        roomRepository.saveAll(rooms);
    }

    private Room room(String number, RoomType type, double price) {
        return Room.builder().roomNumber(number).roomType(type)
                .roomStatus(RoomStatus.AVAILABLE).basePrice(price).build();
    }

    // ── Admin User ───────────────────────────────────────────────────────────────
    private void seedAdminUser() {
        if (userRepository.findByUsername(adminUsername).isPresent()) return;
        userRepository.save(User.builder()
                .username(adminUsername)
                .password(passwordEncoder.encode(adminPassword))
                .fullName(adminFullName)
                .role(UserRole.ADMIN)
                .build());
    }

    // ── Demo Reservations ────────────────────────────────────────────────────────
    private void seedDemoReservations() {
        if (reservationRepository.count() > 0) return;

        List<Room> all = roomRepository.findAll();
        List<Room> d = all.stream()
                .filter(r -> r.getRoomType() == RoomType.DELUXE)
                .sorted((a, b) -> a.getRoomNumber().compareTo(b.getRoomNumber()))
                .collect(Collectors.toList());
        List<Room> s = all.stream()
                .filter(r -> r.getRoomType() == RoomType.SUPER_DELUXE)
                .sorted((a, b) -> a.getRoomNumber().compareTo(b.getRoomNumber()))
                .collect(Collectors.toList());

        LocalDate today = LocalDate.now();
        List<Reservation> list = new ArrayList<>();

        // fmt: name, email, phone, daysAgoCheckOut, nights, room, guests, source, mealPlan, paymentMode
        Object[][] past = {
            {"Rajesh Kumar",     "rajesh.kumar@gmail.com",    "+91 9876543210", 88, 3, d.get(0),  1, BookingSource.OTA,     MealPlan.CP,  PaymentMode.CASH},
            {"Priya Sharma",     "priya.sharma@yahoo.com",    "+91 8765432109", 81, 2, d.get(2),  2, BookingSource.PHONE,   MealPlan.EP,  PaymentMode.UPI},
            {"Amit Singh",       "amit.singh@outlook.com",    "+91 7654321098", 74, 4, s.get(0),  1, BookingSource.PMS,     MealPlan.MAP, PaymentMode.CARD},
            {"Sunita Patel",     "sunita.patel@gmail.com",    "+91 9012345678", 67, 2, d.get(4),  3, BookingSource.OTA,     MealPlan.CP,  PaymentMode.UPI},
            {"Vikram Mehta",     "vikram.mehta@corp.in",      "+91 9123456789", 63, 3, d.get(6),  2, BookingSource.PMS,     MealPlan.EP,  PaymentMode.BANK_TRANSFER},
            {"Deepika Iyer",     "deepika.iyer@gmail.com",    "+91 8234567890", 58, 5, s.get(1),  1, BookingSource.WALK_IN, MealPlan.AP,  PaymentMode.CASH},
            {"Sanjay Gupta",     "sanjay.gupta@hotmail.com",  "+91 9345678901", 52, 2, d.get(8),  2, BookingSource.OTA,     MealPlan.CP,  PaymentMode.CARD},
            {"Kavita Nair",      "kavita.nair@gmail.com",     "+91 8456789012", 46, 3, d.get(10), 3, BookingSource.PHONE,   MealPlan.CP,  PaymentMode.UPI},
            {"Arun Mishra",      "arun.mishra@gmail.com",     "+91 9567890123", 39, 4, s.get(2),  2, BookingSource.PMS,     MealPlan.MAP, PaymentMode.CARD},
            {"Lakshmi Rao",      "lakshmi.rao@gmail.com",     "+91 8678901234", 33, 2, d.get(12), 1, BookingSource.OTA,     MealPlan.EP,  PaymentMode.CASH},
            {"Rahul Verma",      "rahul.verma@corp.com",      "+91 9789012345", 28, 3, d.get(14), 2, BookingSource.PMS,     MealPlan.CP,  PaymentMode.BANK_TRANSFER},
            {"Anita Joshi",      "anita.joshi@gmail.com",     "+91 8890123456", 24, 2, s.get(3),  1, BookingSource.EMAIL,   MealPlan.EP,  PaymentMode.UPI},
            {"Suresh Bhat",      "suresh.bhat@yahoo.in",      "+91 9901234567", 17, 4, d.get(16), 3, BookingSource.WALK_IN, MealPlan.CP,  PaymentMode.CASH},
            {"Pooja Agarwal",    "pooja.agarwal@gmail.com",   "+91 8012345678", 13, 3, d.get(18), 2, BookingSource.OTA,     MealPlan.MAP, PaymentMode.CARD},
            {"Nikhil Reddy",     "nikhil.reddy@outlook.in",   "+91 9123456780", 10, 2, s.get(4),  1, BookingSource.PMS,     MealPlan.EP,  PaymentMode.UPI},
            {"Meera Srivastava", "meera.srivastava@gmail.com","+91 8345678900",  8, 3, d.get(1),  2, BookingSource.PHONE,   MealPlan.CP,  PaymentMode.CASH},
            {"Farhan Mirza",     "farhan.mirza@corp.in",      "+91 9456789010",  6, 2, s.get(5),  1, BookingSource.OTA,     MealPlan.EP,  PaymentMode.CARD},
            {"Geeta Kulkarni",   "geeta.k@gmail.com",         "+91 8567890126",  4, 1, d.get(3),  2, BookingSource.WALK_IN, MealPlan.CP,  PaymentMode.CASH},
            {"Vishal Thapar",    "vishal.thapar@corp.com",    "+91 9678901237",  3, 2, s.get(6),  3, BookingSource.PMS,     MealPlan.MAP, PaymentMode.BANK_TRANSFER},
        };
        for (Object[] r : past) {
            LocalDate co = today.minusDays((int) r[3]);
            LocalDate ci = co.minusDays((int) r[4]);
            Room rm = (Room) r[5];
            list.add(Reservation.builder()
                    .guestName((String)r[0]).guestEmail((String)r[1]).guestPhone((String)r[2])
                    .checkInDate(ci).checkOutDate(co).guestsCount((int)r[6])
                    .amount(rm.getBasePrice() * (int)r[4]).room(rm)
                    .status(ReservationStatus.CHECKED_OUT)
                    .source((BookingSource)r[7]).mealPlan((MealPlan)r[8]).paymentMode((PaymentMode)r[9])
                    .build());
        }

        // fmt: name, email, phone, daysAgoCheckIn, checkoutInDays, room, guests, source, mealPlan, paymentMode
        Object[][] current = {
            {"Arjun Kapoor",    "arjun.kapoor@corp.in",      "+91 8345678901", 5, 2, d.get(0),  2, BookingSource.PMS,     MealPlan.CP,  PaymentMode.CASH},
            {"Sneha Chopra",    "sneha.chopra@gmail.com",    "+91 9456789012", 3, 3, d.get(1),  1, BookingSource.OTA,     MealPlan.EP,  PaymentMode.UPI},
            {"Ravi Tiwari",     "ravi.tiwari@gmail.com",     "+91 8567890123", 2, 2, d.get(2),  3, BookingSource.WALK_IN, MealPlan.CP,  PaymentMode.CASH},
            {"Anjali Bhatt",    "anjali.bhatt@yahoo.in",     "+91 9678901234", 2, 4, d.get(3),  2, BookingSource.PHONE,   MealPlan.MAP, PaymentMode.CARD},
            {"Manoj Kumar",     "manoj.kumar@gmail.com",     "+91 8789012345", 4, 2, d.get(4),  1, BookingSource.OTA,     MealPlan.EP,  PaymentMode.UPI},
            {"Divya Singh",     "divya.singh@outlook.com",   "+91 9890123456", 1, 5, d.get(5),  2, BookingSource.PMS,     MealPlan.CP,  PaymentMode.BANK_TRANSFER},
            {"Kiran Yadav",     "kiran.yadav@gmail.com",     "+91 8901234567", 3, 2, d.get(6),  3, BookingSource.EMAIL,   MealPlan.EP,  PaymentMode.CASH},
            {"Rohit Sharma",    "rohit.sharma@corp.in",      "+91 9012345679", 4, 3, d.get(7),  1, BookingSource.PMS,     MealPlan.MAP, PaymentMode.CARD},
            {"Swati Malhotra",  "swati.malhotra@gmail.com",  "+91 8123456789", 1, 3, d.get(8),  2, BookingSource.OTA,     MealPlan.CP,  PaymentMode.UPI},
            {"Dinesh Pillai",   "dinesh.pillai@gmail.com",   "+91 9234567891", 5, 4, d.get(9),  1, BookingSource.WALK_IN, MealPlan.EP,  PaymentMode.CASH},
            {"Nisha Choudhary", "nisha.choudhary@yahoo.com", "+91 8345678902", 3, 3, d.get(10), 3, BookingSource.PMS,     MealPlan.CP,  PaymentMode.CARD},
            {"Ajay Bansal",     "ajay.bansal@corp.in",       "+91 9456789013", 1, 4, d.get(11), 2, BookingSource.OTA,     MealPlan.MAP, PaymentMode.UPI},
            {"Smita Desai",     "smita.desai@gmail.com",     "+91 8567890124", 4, 2, d.get(12), 1, BookingSource.PHONE,   MealPlan.CP,  PaymentMode.CASH},
            {"Prakash Goswami", "prakash.goswami@gmail.com", "+91 9678901235", 6, 2, d.get(13), 2, BookingSource.PMS,     MealPlan.EP,  PaymentMode.BANK_TRANSFER},
            {"Varun Shah",      "varun.shah@outlook.in",     "+91 8789012346", 2, 4, d.get(14), 1, BookingSource.OTA,     MealPlan.CP,  PaymentMode.UPI},
            {"Preethi Menon",   "preethi.menon@gmail.com",   "+91 9890123458", 3, 3, d.get(15), 3, BookingSource.WALK_IN, MealPlan.MAP, PaymentMode.CASH},
            {"Rina Sinha",      "rina.sinha@gmail.com",      "+91 8901234568", 4, 3, s.get(0),  2, BookingSource.PMS,     MealPlan.AP,  PaymentMode.CARD},
            {"Tarun Saxena",    "tarun.saxena@corp.com",     "+91 9012345680", 2, 5, s.get(1),  1, BookingSource.OTA,     MealPlan.CP,  PaymentMode.UPI},
            {"Pallavi Dixit",   "pallavi.dixit@gmail.com",   "+91 8123456790", 5, 2, s.get(2),  3, BookingSource.PHONE,   MealPlan.MAP, PaymentMode.CASH},
            {"Harish Rao",      "harish.rao@gmail.com",      "+91 9234567892", 3, 4, s.get(3),  2, BookingSource.PMS,     MealPlan.CP,  PaymentMode.CARD},
            {"Gita Pandey",     "gita.pandey@yahoo.in",      "+91 8345678903", 1, 3, s.get(4),  1, BookingSource.EMAIL,   MealPlan.EP,  PaymentMode.UPI},
            {"Jayesh Bose",     "jayesh.bose@corp.in",       "+91 9456789014", 4, 2, s.get(5),  2, BookingSource.OTA,     MealPlan.MAP, PaymentMode.CASH},
            {"Chetan Malviya",  "chetan.malviya@gmail.com",  "+91 8567890125", 2, 5, s.get(6),  1, BookingSource.PMS,     MealPlan.CP,  PaymentMode.BANK_TRANSFER},
        };
        for (Object[] r : current) {
            LocalDate ci = today.minusDays((int) r[3]);
            LocalDate co = today.plusDays((int) r[4]);
            Room rm = (Room) r[5];
            int nights = (int)(co.toEpochDay() - ci.toEpochDay());
            list.add(Reservation.builder()
                    .guestName((String)r[0]).guestEmail((String)r[1]).guestPhone((String)r[2])
                    .checkInDate(ci).checkOutDate(co).guestsCount((int)r[6])
                    .amount(rm.getBasePrice() * nights).room(rm)
                    .status(ReservationStatus.CHECKED_IN)
                    .source((BookingSource)r[7]).mealPlan((MealPlan)r[8]).paymentMode((PaymentMode)r[9])
                    .build());
            rm.setRoomStatus(RoomStatus.OCCUPIED);
            roomRepository.save(rm);
        }

        // fmt: name, email, phone, daysFromNowCheckIn, nights, room, guests, source, mealPlan, paymentMode
        Object[][] upcoming = {
            {"Sundar Krishnan",   "sundar.k@gmail.com",      "+91 9567890124", 1, 3, d.get(16), 2, BookingSource.OTA,   MealPlan.CP,  PaymentMode.CASH},
            {"Rekha Pillai",      "rekha.pillai@yahoo.in",   "+91 8678901235", 2, 4, d.get(17), 1, BookingSource.PMS,   MealPlan.EP,  PaymentMode.CARD},
            {"Kavya Nambiar",     "kavya.n@gmail.com",       "+91 9789012346", 1, 2, s.get(7),  3, BookingSource.PHONE, MealPlan.MAP, PaymentMode.UPI},
            {"Preeti Srivastava", "preeti.s@outlook.in",     "+91 8890123457", 3, 5, s.get(8),  2, BookingSource.OTA,   MealPlan.CP,  PaymentMode.BANK_TRANSFER},
        };
        for (Object[] r : upcoming) {
            LocalDate ci = today.plusDays((int) r[3]);
            LocalDate co = ci.plusDays((int) r[4]);
            Room rm = (Room) r[5];
            list.add(Reservation.builder()
                    .guestName((String)r[0]).guestEmail((String)r[1]).guestPhone((String)r[2])
                    .checkInDate(ci).checkOutDate(co).guestsCount((int)r[6])
                    .amount(rm.getBasePrice() * (int)r[4]).room(rm)
                    .status(ReservationStatus.BOOKED)
                    .source((BookingSource)r[7]).mealPlan((MealPlan)r[8]).paymentMode((PaymentMode)r[9])
                    .build());
            rm.setRoomStatus(RoomStatus.OCCUPIED);
            roomRepository.save(rm);
        }

        reservationRepository.saveAll(list);
    }
}
