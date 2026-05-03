package com.hotel.backend.Controllers;

import com.hotel.backend.Service.AIService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class AIController {
    private final AIService aiService;

    @PostMapping("/chat")
    public Map<String,String>chat(@RequestBody Map<String,String> body){
        String message=body.getOrDefault("message","").trim();
        if(message.isEmpty()) return Map.of("reply","Please ask a question.");
        return Map.of("reply", aiService.chat(message));

    }
}
