package com.brentversal.editrequest.constant;

// 관리자가 중개인에게 보낸 매물 수정 요청의 처리 상태
//
// 요청을 받은 중개인이 그 매물을 실제로 수정하면 자동으로 RESOLVED 가 된다.
// (PropertyService.update 가 수정 성공 직후 그 매물의 미처리 요청을 모두 처리 완료로 바꾼다)
public enum EditRequestStatus {
    REQUESTED("처리 대기"),
    RESOLVED("처리 완료");

    private final String label;

    EditRequestStatus(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
