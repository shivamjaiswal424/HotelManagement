package com.hotel.backend.Controllers;

import com.hotel.backend.Entity.Company;
import com.hotel.backend.Repository.CompanyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/companies")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class CompanyController {

    private final CompanyRepository companyRepository;

    @GetMapping
    public List<Company> getAll(@RequestParam(required = false) String search) {
        if (search == null || search.isBlank()) return companyRepository.findAll();
        return companyRepository.findByNameContainingIgnoreCase(search);
    }

    @PostMapping
    public Company create(@RequestBody Company company) {
        if (company.getTotalBilled() == null) company.setTotalBilled(0.0);
        if (company.getTotalOutstanding() == null) company.setTotalOutstanding(0.0);
        return companyRepository.save(company);
    }
}