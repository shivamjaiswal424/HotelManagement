package com.hotel.backend.DTO;

import lombok.Data;

@Data
public class AuthRequest {
    private String username;
    private String password;
}
