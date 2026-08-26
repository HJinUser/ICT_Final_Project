package com.brentversal.notification.service;

import com.brentversal.agency.constant.ConsultationStatus;
import com.brentversal.agency.entity.Agency;
import com.brentversal.agency.repository.AgencyConsultationRepository;
import com.brentversal.agency.repository.AgencyReviewRepository;
import com.brentversal.agency.service.MemberConsultationService;
import com.brentversal.agency.service.MyAgencyService;
import com.brentversal.editrequest.entity.PropertyEditRequest;
import com.brentversal.editrequest.service.PropertyEditRequestService;
import com.brentversal.member.constant.Role;
import com.brentversal.member.constant.VerifyStatus;
import com.brentversal.member.entity.Member;
import com.brentversal.member.repository.BrokerRepository;
import com.brentversal.member.repository.MemberRepository;
import com.brentversal.notification.constant.NotificationType;
import com.brentversal.notice.service.NoticeService;
import com.brentversal.notification.dto.NotificationDto;
import com.brentversal.property.constant.PropertyStatus;
import com.brentversal.property.repository.PropertyRepository;
import lombok.RequiredArgsConstructor;
import org.jsoup.Jsoup;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

// 헤더 종 아이콘에 표시할 알림을 역할에 맞게 모아 주는 서비스
//
// 알림 종류
//   공통   : 최근 공지사항                      -> "[공지] 제목" 을 누르면 공지 상세로 간다
//   공통   : 내가 보낸 상담에 답변이 도착        -> "내 상담" 화면으로 간다
//   중개인 : 미답변 상담 요청, 미답변 리뷰      -> 답변 화면으로 간다
//   중개인 : 관리자가 보낸 매물 수정 요청       -> 매물 수정 화면으로 간다
//   관리자 : 승인 대기 매물, 심사 대기 인증 신청 -> 각 관리 화면으로 간다
//
// 알림은 이 도메인에서만 만든다.
// 각 도메인(agency, property, member)은 자기 자료만 갖고 있고, 그것을 알림으로 바꾸는 일은
// 여기서 한다. 그래야 알림 종류가 늘어나도 고칠 파일이 이 하나로 끝나고,
// 도메인끼리 서로를 참조하는 일이 생기지 않는다.
@Service
@RequiredArgsConstructor
public class NotificationService {
    private final MemberRepository memberRepository ;

    // 내가 보낸 상담의 답변을 찾을 때 쓴다 (역할과 상관없이 모두에게 해당)
    private final MemberConsultationService memberConsultationService ;

    // 중개인 알림 : 내 사무소를 찾은 뒤 상담·리뷰를 본다
    private final MyAgencyService myAgencyService ;
    private final AgencyConsultationRepository agencyConsultationRepository ;
    private final AgencyReviewRepository agencyReviewRepository ;

    // 중개인 알림 : 관리자가 보낸 매물 수정 요청 중 아직 처리하지 않은 것
    private final PropertyEditRequestService propertyEditRequestService ;

    // 관리자 알림 : 승인·심사를 기다리는 자료를 본다
    private final PropertyRepository propertyRepository ;
    private final BrokerRepository brokerRepository ;

    // 공지사항 알림 (역할과 상관없이 모두에게 보여 준다)
    private final NoticeService noticeService ;

    // 종류별로 너무 많이 쌓이면 드롭다운이 길어지므로 개수를 끊는다
    private static final int ITEM_LIMIT = 5 ;

    // 공지는 최신 몇 건만 알림에 건다 (전체 목록은 공지사항 화면에서 본다)
    private static final int NOTICE_LIMIT = 3 ;

    // 화면정의서 1-2 : 헤더 알림은 최근 5개까지만 보여 준다.
    // 종류별로 자른 뒤에도 여러 종류가 합쳐지면 5개를 넘을 수 있어, 마지막에 한 번 더 끊는다.
    private static final int TOTAL_LIMIT = 5 ;

    @Transactional(readOnly = true)
    public List<NotificationDto> getNotifications(String email){
        List<NotificationDto> notifications = new ArrayList<>();

        Member member = memberRepository.findByEmail(email);

        if(member == null) return notifications;

        // 역할과 상관없이 모두가 받는 알림
        addNotices(notifications);

        // 내가 보낸 상담에 답변이 오면 알려 준다.
        // 상담은 누구나 보낼 수 있으므로 일반 사용자도 이 알림을 받는다.
        addMyConsultationReplies(notifications, member.getId());

        // 역할별 알림
        if(member.getRole() == Role.BROKER){
            addBrokerItems(notifications, email);
        } else if(member.getRole() == Role.ADMIN){
            addAdminItems(notifications);
        }

        // 종류가 섞여 있으므로 최신 것이 위로 오도록 다시 정렬한다.
        // createdAt 이 비어 있는 자료가 섞여도 오류가 나지 않게 null 을 뒤로 보낸다.
        notifications.sort(Comparator.comparing(NotificationDto::getCreatedAt,
                Comparator.nullsLast(Comparator.reverseOrder())));

        // 최신 5개만 남긴다
        return notifications.stream().limit(TOTAL_LIMIT).toList();
    }

    // 최근 공지사항. 제목 앞에 [공지] 를 붙여 다른 알림과 구분한다.
    //
    // 목록 조회(findAll)를 쓰고 상세 조회(findById)는 쓰지 않는다.
    // 상세 조회는 부르는 순간 조회수를 올리기 때문에, 알림을 만들 때마다 조회수가 늘어난다.
    private void addNotices(List<NotificationDto> notifications){
        noticeService.findAll().stream()
                .limit(NOTICE_LIMIT)
                .forEach(notice -> notifications.add(NotificationDto.of(
                        NotificationType.NOTICE,
                        notice.getId(),
                        "[공지] " + notice.getTitle(),
                        // 공지 본문은 편집기로 쓴 HTML 이라 그대로 자르면
                        // "<p>오늘 수업만 끝나면</p><h2>..." 처럼 태그가 알림에 노출된다.
                        summarize(stripHtml(notice.getContent())),
                        "/notice/" + notice.getId(), // 공지 상세 화면
                        notice.getCreatedAt())));
    }

    // 내가 보낸 상담에 답변이 도착했지만 아직 확인하지 않은 것.
    //
    // 중개인 알림은 답변을 하면 목록에서 사라지지만, 이쪽은 그런 계기가 없다.
    // 그래서 사용자가 "내 상담" 화면에서 답변을 펼쳐 보면 확인 시각(replyCheckedAt)이 남고,
    // 그때부터 이 목록에서 빠진다.
    private void addMyConsultationReplies(List<NotificationDto> notifications, Long memberId){
        memberConsultationService.findUncheckedReplies(memberId)
                .forEach(bean -> notifications.add(NotificationDto.of(
                        NotificationType.CONSULTATION_REPLY,
                        bean.getId(),
                        (bean.getAgency() == null ? "중개사무소" : bean.getAgency().getName()) + "에서 답변이 도착했습니다.",
                        summarize(bean.getReply()),
                        "/my-consultations", // 내 상담 화면
                        bean.getRepliedAt())));
    }

    // 중개인 알림 : 아직 답변하지 않은 상담 요청과 리뷰
    // 답변을 하면 목록에서 사라지므로 따로 "읽음" 처리를 하지 않는다.
    private void addBrokerItems(List<NotificationDto> notifications, String email){
        Agency agency;

        try {
            agency = myAgencyService.findMyAgency(email);
        } catch (IllegalArgumentException e) {
            return; // 사무소가 아직 없는 중개인은 보여 줄 상담·리뷰도 없다
        }

        agencyConsultationRepository
                .findByAgencyIdAndStatusOrderByCreatedAtDesc(agency.getId(), ConsultationStatus.REQUESTED)
                .forEach(bean -> notifications.add(NotificationDto.of(
                        NotificationType.CONSULTATION,
                        bean.getId(),
                        "새 상담 요청이 도착했습니다.",
                        summarize(bean.getContent()),
                        "/broker/consultations/" + bean.getId(), // 답변하기 화면
                        bean.getCreatedAt())));

        agencyReviewRepository
                .findByAgencyIdAndReplyIsNullOrderByIdDesc(agency.getId(), PageRequest.of(0, ITEM_LIMIT))
                .forEach(bean -> notifications.add(NotificationDto.of(
                        NotificationType.REVIEW,
                        bean.getId(),
                        "답변하지 않은 리뷰가 있습니다.",
                        summarize(bean.getContent()),
                        "/broker/agency?tab=reviews", // 리뷰 관리 탭
                        bean.getCreatedAt())));

        // 관리자가 보낸 매물 수정 요청.
        // 그 매물을 고치면 요청이 자동으로 처리 완료가 되므로 여기서도 함께 사라진다.
        for(PropertyEditRequest bean : propertyEditRequestService.findOpenByAgency(agency.getId())){
            notifications.add(NotificationDto.of(
                    NotificationType.MODIFY_REQUEST,
                    bean.getProperty().getId(),
                    "\"" + bean.getProperty().getName() + "\" 매물에 수정 요청이 도착했습니다.",
                    summarize(bean.getReason()),
                    "/property/form/" + bean.getProperty().getId(), // 매물 수정 화면
                    bean.getCreatedAt()));
        }
    }

    // 관리자 알림 : 승인 대기 매물과 심사 대기 인증 신청
    private void addAdminItems(List<NotificationDto> notifications){
        propertyRepository
                .findByStatusOrderByCreatedAtAsc(PropertyStatus.PENDING, PageRequest.of(0, ITEM_LIMIT))
                .forEach(bean -> notifications.add(NotificationDto.of(
                        NotificationType.PROPERTY_APPROVAL,
                        bean.getId(),
                        "승인 대기 매물이 있습니다.",
                        bean.getName(),
                        "/admin/properties", // 매물 승인 화면
                        bean.getCreatedAt())));

        brokerRepository
                .findByVerifyStatusOrderBySubmittedAtAsc(VerifyStatus.PENDING, PageRequest.of(0, ITEM_LIMIT))
                .forEach(bean -> notifications.add(NotificationDto.of(
                        NotificationType.BROKER_VERIFICATION,
                        bean.getId(),
                        "중개인 인증 신청이 있습니다.",
                        bean.getBusinessName() == null ? "상호 미입력" : bean.getBusinessName(),
                        "/admin/brokers", // 중개인 인증 화면
                        bean.getSubmittedAt())));
    }

    // 알림 목록에 본문을 통째로 넣으면 너무 길어서 앞부분만 잘라 쓴다.
    private String summarize(String text){
        if(text == null) return "";
        return text.length() <= 40 ? text : text.substring(0, 40) + "…";
    }

    // HTML 로 저장된 글에서 사람이 읽을 글자만 남긴다.
    //
    // 공지사항은 편집기로 작성해서 본문이 "<p>...</p><h2><strong>..." 형태로 저장된다.
    // 알림은 한 줄 미리보기라 HTML 을 그려 줄 수 없으므로 태그를 걷어내고 글자만 쓴다.
    // 직접 잘라내지 않고 jsoup 에 맡기는 이유는 &nbsp; 같은 문자 표기와 줄바꿈·공백까지
    // 함께 정리해 주기 때문이다. 태그 안에 '>' 가 들어간 경우처럼 직접 자르면 틀리는 경우도 있다.
    private String stripHtml(String html){
        if(html == null) return "";
        return Jsoup.parse(html).text();
    }
}
