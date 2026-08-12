package com.brentversal.notification.controller;

import com.brentversal.notification.dto.NotificationDto;
import com.brentversal.notification.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.util.List;
import java.util.Map;

// 헤더 종 아이콘이 부르는 알림 API
//
// 역할(일반 사용자·중개인·관리자)에 따라 담기는 항목이 달라지지만, 프론트는 한 곳만 부르면 된다.
// 로그인한 사람이면 누구나 부를 수 있고(공지사항은 모두가 받는다), 비로그인은 시큐리티가 401 로 막는다.
@RestController
@RequestMapping("/notifications")
@RequiredArgsConstructor
public class NotificationController {
    private final NotificationService notificationService ;

    // GET /notifications
    // 화면이 깨지지 않도록, 문제가 생겨도 오류 대신 빈 목록을 돌려준다.
    @GetMapping
    public ResponseEntity<Map<String, Object>> notifications(Principal principal){
        try {
            List<NotificationDto> list = notificationService.getNotifications(principal.getName());

            return ResponseEntity.ok(Map.of("content", list, "unreadCount", list.size()));

        } catch (RuntimeException e) {
            return ResponseEntity.ok(Map.of("content", List.of(), "unreadCount", 0));
        }
    }
}
