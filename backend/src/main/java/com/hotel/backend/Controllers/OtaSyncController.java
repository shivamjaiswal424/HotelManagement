package com.hotel.backend.Controllers;

import com.hotel.backend.Entity.*;
import com.hotel.backend.Repository.*;
import com.hotel.backend.Service.ICalSyncService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/ota-sync")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class OtaSyncController {

    private final OtaSyncConfigRepository configRepository;
    private final OtaSyncLogRepository    logRepository;
    private final ICalSyncService         syncService;

    // ── Configs ───────────────────────────────────────────────────────────────

    @GetMapping("/configs")
    public List<OtaSyncConfig> getConfigs() {
        return configRepository.findAll();
    }

    @PostMapping("/configs")
    public OtaSyncConfig saveConfig(@RequestBody OtaSyncConfig config) {
        if (config.isEnabled() == false && config.getId() == null) config.setEnabled(true);
        return configRepository.save(config);
    }

    @PutMapping("/configs/{id}")
    public OtaSyncConfig updateConfig(@PathVariable Long id, @RequestBody OtaSyncConfig body) {
        OtaSyncConfig existing = configRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Config not found"));
        existing.setOtaName(body.getOtaName());
        existing.setIcalUrl(body.getIcalUrl());
        existing.setRoomType(body.getRoomType());
        existing.setEnabled(body.isEnabled());
        return configRepository.save(existing);
    }

    @DeleteMapping("/configs/{id}")
    public ResponseEntity<Void> deleteConfig(@PathVariable Long id) {
        configRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/configs/{id}/toggle")
    public OtaSyncConfig toggle(@PathVariable Long id) {
        OtaSyncConfig c = configRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Config not found"));
        c.setEnabled(!c.isEnabled());
        return configRepository.save(c);
    }

    // ── Sync actions ──────────────────────────────────────────────────────────

    @PostMapping("/sync/{id}")
    public OtaSyncLog syncOne(@PathVariable Long id) {
        OtaSyncConfig config = configRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Config not found"));
        return syncService.sync(config);
    }

    @PostMapping("/sync-all")
    public Map<String, Object> syncAll() {
        List<OtaSyncConfig> enabled = configRepository.findByEnabledTrue();
        int total = 0, newBookings = 0;
        for (OtaSyncConfig c : enabled) {
            OtaSyncLog result = syncService.sync(c);
            newBookings += result.getNewBookings();
            total++;
        }
        return Map.of("synced", total, "newBookings", newBookings);
    }

    @PostMapping("/test-url")
    public Map<String, Object> testUrl(@RequestBody Map<String, String> body) {
        String url = body.get("url");
        if (url == null || url.isBlank())
            return Map.of("valid", false, "message", "URL is required");
        return syncService.testUrl(url);
    }

    // ── Logs ──────────────────────────────────────────────────────────────────

    @GetMapping("/logs")
    public List<OtaSyncLog> getLogs() {
        return logRepository.findAllByOrderBySyncedAtDesc(PageRequest.of(0, 50));
    }
}
