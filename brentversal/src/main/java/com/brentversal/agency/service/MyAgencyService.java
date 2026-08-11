package com.brentversal.agency.service;

import com.brentversal.agency.constant.ConsultationStatus;
import com.brentversal.agency.dto.*;
import com.brentversal.agency.entity.Agency;
import com.brentversal.agency.entity.AgencyConsultation;
import com.brentversal.agency.entity.AgencyReview;
import com.brentversal.agency.repository.AgencyConsultationRepository;
import com.brentversal.agency.repository.AgencyRepository;
import com.brentversal.agency.repository.AgencyReviewRepository;
import com.brentversal.member.entity.Member;
import com.brentversal.member.repository.MemberRepository;
import com.brentversal.property.constant.PropertyStatus;
import com.brentversal.property.repository.PropertyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

// 로그인한 중개인이 자기 사무소를 관리하는 화면("내 중개사무소", 중개인 마이페이지)의 서비스
//
// 이 서비스의 모든 메소드는 이메일(로그인한 사람)을 받아서 그 사람의 사무소를 찾는다.
// 사무소 id 를 파라미터로 받지 않는 이유는, 남의 사무소 id 를 넣어 조회하는 일을 원천적으로 막기 위해서다.
@Service
@RequiredArgsConstructor
public class MyAgencyService {
    private final AgencyRepository agencyRepository ;
    private final AgencyConsultationRepository agencyConsultationRepository ;
    private final AgencyReviewRepository agencyReviewRepository ;
    private final PropertyRepository propertyRepository ;
    private final MemberRepository memberRepository ;

    // 등록 매물 카드는 2행 3열이라 한 페이지에 6개, 리뷰는 한 페이지에 10개씩 보여 준다.
    private static final int PROPERTY_PAGE_SIZE = 6 ;
    private static final int REVIEW_PAGE_SIZE = 10 ;

    // 로그인한 사람의 중개사무소를 찾는다.
    // 사무소가 아직 없으면(인증 전이거나 등록 전) 예외를 던지고, 컨트롤러가 404 로 바꿔서 응답한다.
    @Transactional(readOnly = true)
    public Agency findMyAgency(String email){
        Member member = memberRepository.findByEmail(email);

        if(member == null){
            throw new IllegalArgumentException("회원 정보를 찾을 수 없습니다.");
        }

        return agencyRepository.findByMemberId(member.getId())
                .orElseThrow(() -> new IllegalArgumentException("등록된 중개사무소가 없습니다. 중개사무소 인증을 먼저 진행해 주세요."));
    }

    // 상단 요약(대시보드)에 쓰는 숫자들을 한 번에 모아 준다.
    @Transactional(readOnly = true)
    public MyAgencyDashboardDto getDashboard(String email){
        Agency agency = findMyAgency(email);
        Long agencyId = agency.getId();

        MyAgencyDashboardDto dto = new MyAgencyDashboardDto();

        // 매물 현황
        dto.setActiveCount(propertyRepository.countByAgencyIdAndStatus(agencyId, PropertyStatus.ACTIVE));
        dto.setInProgressCount(propertyRepository.countByAgencyIdAndStatus(agencyId, PropertyStatus.IN_PROGRESS));
        dto.setCompletedCount(propertyRepository.countByAgencyIdAndStatus(agencyId, PropertyStatus.COMPLETED));
        dto.setPendingCount(propertyRepository.countByAgencyIdAndStatus(agencyId, PropertyStatus.PENDING));

        // 문의 현황
        dto.setRequestedConsultationCount(
                agencyConsultationRepository.countByAgencyIdAndStatus(agencyId, ConsultationStatus.REQUESTED));
        dto.setAcceptedConsultationCount(
                agencyConsultationRepository.countByAgencyIdAndStatus(agencyId, ConsultationStatus.ACCEPTED));
        dto.setDoneConsultationCount(
                agencyConsultationRepository.countByAgencyIdAndStatus(agencyId, ConsultationStatus.DONE));

        // 평가 현황
        dto.setRatingAvg(agency.getRatingAvg() == null ? 0.0 : agency.getRatingAvg());
        dto.setReviewCount(agencyReviewRepository.countByAgencyId(agencyId));
        dto.setUnansweredReviewCount(agencyReviewRepository.countByAgencyIdAndReplyIsNull(agencyId));

        return dto;
    }

    // 내가 등록한 매물 목록 (한 페이지 6개)
    @Transactional(readOnly = true)
    public Page<MyPropertyCardDto> getMyProperties(String email, int page){
        Agency agency = findMyAgency(email);

        // PageRequest.of(페이지번호, 한페이지크기) - 페이지 번호는 0부터 시작한다
        Pageable pageable = PageRequest.of(Math.max(0, page), PROPERTY_PAGE_SIZE);

        return propertyRepository.findByAgencyIdOrderByCreatedAtDesc(agency.getId(), pageable)
                .map(MyPropertyCardDto::of);
    }

    // 내 사무소로 들어온 상담 요청 목록
    // status 가 null 이거나 "ALL" 이면 전체를 보여 준다 (문의 관리 필터의 기본값).
    @Transactional(readOnly = true)
    public List<ConsultationResponseDto> getMyConsultations(String email, String status){
        Agency agency = findMyAgency(email);

        List<AgencyConsultation> list;

        if(status == null || status.isBlank() || "ALL".equalsIgnoreCase(status)){
            list = agencyConsultationRepository.findByAgencyIdOrderByCreatedAtDesc(agency.getId());
        } else {
            // 잘못된 값이 들어오면 valueOf 에서 예외가 나므로 미리 확인해서 안내 메시지를 준다
            ConsultationStatus filter = toConsultationStatus(status);
            list = agencyConsultationRepository.findByAgencyIdAndStatusOrderByCreatedAtDesc(agency.getId(), filter);
        }

        return list.stream().map(ConsultationResponseDto::of).toList();
    }

    // 상담 요청 1건 조회 ("답변하기" 페이지에서 쓴다)
    @Transactional(readOnly = true)
    public ConsultationResponseDto getMyConsultation(String email, Long consultationId){
        return ConsultationResponseDto.of(findMyConsultation(email, consultationId));
    }

    // 상담 요청에 답변을 저장한다.
    // 아직 답변 전('상담 요청')이었다면 답변을 보낸 시점에 '상담 확정'으로 넘어간다.
    // 이미 완료되었거나 종료된 상담에 답변을 고치는 경우에는 상태를 되돌리지 않는다.
    @Transactional
    public ConsultationResponseDto replyToConsultation(String email, Long consultationId, String reply){
        if(reply == null || reply.isBlank()){
            throw new IllegalArgumentException("답변 내용을 입력해 주세요.");
        }

        AgencyConsultation bean = findMyConsultation(email, consultationId);

        bean.setReply(reply.trim());
        bean.setRepliedAt(LocalDateTime.now());

        if(bean.getStatus() == ConsultationStatus.REQUESTED){
            bean.setStatus(ConsultationStatus.ACCEPTED);
        }
        // 영속 상태의 엔터티라서 트랜잭션이 끝나면 UPDATE 가 자동으로 실행된다

        return ConsultationResponseDto.of(bean);
    }

    // 상담 상태를 직접 바꾼다. (상담 완료 처리, 종료 처리)
    // 화면의 [상담 완료] / [종료] 버튼이 이 메소드를 쓴다.
    @Transactional
    public ConsultationResponseDto updateConsultationStatus(String email, Long consultationId, String status){
        AgencyConsultation bean = findMyConsultation(email, consultationId);

        bean.setStatus(toConsultationStatus(status));

        return ConsultationResponseDto.of(bean);
    }

    // 상담 1건을 찾아오면서 "내 사무소로 온 요청이 맞는지"까지 확인한다.
    // 조회·답변·상태변경에서 똑같이 필요한 검사라 따로 뺐다.
    private AgencyConsultation findMyConsultation(String email, Long consultationId){
        Agency agency = findMyAgency(email);

        AgencyConsultation bean = agencyConsultationRepository.findById(consultationId)
                .orElseThrow(() -> new IllegalArgumentException("해당 상담 요청을 찾을 수 없습니다."));

        // 다른 사무소로 온 요청을 id 만 바꿔서 열어 보거나 고치는 것을 막는다
        if(!bean.getAgency().getId().equals(agency.getId())){
            throw new IllegalArgumentException("내 중개사무소로 온 상담 요청이 아닙니다.");
        }

        return bean;
    }

    // 리뷰 관리 탭의 목록 (한 페이지 10개)
    // filter : ALL(전체) / UNANSWERED(미답변만) / ANSWERED(답변 완료)
    @Transactional(readOnly = true)
    public Page<AgencyReviewDto> getMyReviews(String email, String filter, int page){
        Agency agency = findMyAgency(email);
        Long agencyId = agency.getId();

        Pageable pageable = PageRequest.of(Math.max(0, page), REVIEW_PAGE_SIZE);

        Page<AgencyReview> result = switch (filter == null ? "ALL" : filter.toUpperCase()) {
            case "UNANSWERED" -> agencyReviewRepository.findByAgencyIdAndReplyIsNullOrderByIdDesc(agencyId, pageable);
            case "ANSWERED" -> agencyReviewRepository.findByAgencyIdAndReplyIsNotNullOrderByIdDesc(agencyId, pageable);
            default -> agencyReviewRepository.findByAgencyIdOrderByIdDesc(agencyId, pageable);
        };

        return result.map(AgencyReviewDto::of);
    }

    // 리뷰에 답변을 단다.
    @Transactional
    public AgencyReviewDto replyToReview(String email, Long reviewId, String reply){
        if(reply == null || reply.isBlank()){
            throw new IllegalArgumentException("답변 내용을 입력해 주세요.");
        }

        Agency agency = findMyAgency(email);

        AgencyReview bean = agencyReviewRepository.findById(reviewId)
                .orElseThrow(() -> new IllegalArgumentException("해당 리뷰를 찾을 수 없습니다."));

        if(!bean.getAgency().getId().equals(agency.getId())){
            throw new IllegalArgumentException("내 중개사무소의 리뷰가 아닙니다.");
        }

        bean.setReply(reply.trim());
        bean.setRepliedAt(LocalDateTime.now());

        return AgencyReviewDto.of(bean);
    }

    // 사무소 정보 수정 (사무소 정보 탭의 "수정" 모드에서 저장할 때)
    // 이름·주소처럼 화면에서 고칠 수 있는 값만 반영한다.
    // 인증 여부(verified)나 평점(ratingAvg)처럼 중개인이 마음대로 바꾸면 안 되는 값은 건드리지 않는다.
    @Transactional
    public AgencyDetailDto updateMyAgency(String email, AgencyDetailDto dto){
        Agency agency = findMyAgency(email);

        if(dto.getName() != null && !dto.getName().isBlank()) agency.setName(dto.getName().trim());
        if(dto.getBrokerName() != null && !dto.getBrokerName().isBlank()) agency.setBrokerName(dto.getBrokerName().trim());
        if(dto.getAddress() != null && !dto.getAddress().isBlank()) agency.setAddress(dto.getAddress().trim());

        agency.setPhone(dto.getPhone());
        agency.setHours(dto.getHours());
        agency.setRegistrationNo(dto.getRegistrationNo());
        agency.setLatitude(dto.getLatitude());
        agency.setLongitude(dto.getLongitude());

        // 상담 가능 상태(AVAILABLE / RESERVED / CLOSED)는 중개인이 직접 바꿀 수 있는 값이다
        if(dto.getStatus() != null && !dto.getStatus().isBlank()){
            agency.setStatus(com.brentversal.agency.constant.AgencyStatus.valueOf(dto.getStatus()));
        }

        return AgencyDetailDto.of(agency);
    }

    // 헤더 종 아이콘에 표시할 알림 목록.
    // 답변하지 않은 상담 요청과 리뷰를 최신순으로 합쳐서 돌려준다.
    @Transactional(readOnly = true)
    public List<NotificationDto> getNotifications(String email){
        Agency agency = findMyAgency(email);

        List<NotificationDto> notifications = new ArrayList<>();

        // (1) 아직 답변하지 않은 상담 요청
        agencyConsultationRepository
                .findByAgencyIdAndStatusOrderByCreatedAtDesc(agency.getId(), ConsultationStatus.REQUESTED)
                .forEach(bean -> notifications.add(NotificationDto.of(
                        "CONSULTATION",
                        bean.getId(),
                        "새 상담 요청이 도착했습니다.",
                        summarize(bean.getContent()),
                        "/broker/consultations/" + bean.getId(), // 답변하기 페이지 주소
                        bean.getCreatedAt())));

        // (2) 아직 답변하지 않은 리뷰
        agencyReviewRepository
                .findByAgencyIdAndReplyIsNullOrderByIdDesc(agency.getId(), PageRequest.of(0, REVIEW_PAGE_SIZE))
                .forEach(bean -> notifications.add(NotificationDto.of(
                        "REVIEW",
                        bean.getId(),
                        "답변하지 않은 리뷰가 있습니다.",
                        summarize(bean.getContent()),
                        "/broker/agency?tab=reviews",
                        bean.getCreatedAt())));

        // 두 종류를 합쳤으므로 시간 순서가 섞여 있다. 최신 것이 위로 오도록 다시 정렬한다.
        // createdAt 이 비어 있는 예전 데이터가 섞여도 오류가 나지 않게 null 을 뒤로 보낸다.
        notifications.sort(Comparator.comparing(NotificationDto::getCreatedAt,
                Comparator.nullsLast(Comparator.reverseOrder())));

        return notifications;
    }

    // 알림 목록에 문의 내용을 통째로 넣으면 너무 길어서 앞부분만 잘라 쓴다.
    private String summarize(String text){
        if(text == null) return "";
        return text.length() <= 40 ? text : text.substring(0, 40) + "…";
    }

    // 문자열로 들어온 상태값을 열거형으로 바꾼다. 잘못된 값이면 안내 메시지를 준다.
    private ConsultationStatus toConsultationStatus(String status){
        try {
            return ConsultationStatus.valueOf(status.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("알 수 없는 상태값입니다 : " + status);
        }
    }
}
