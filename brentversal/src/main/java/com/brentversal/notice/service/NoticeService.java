//package com.brentversal.notice.service;
//
//import
//import org.apache.tomcat.util.descriptor.web.Injectable; { Injectable } from '@nestjs/common';
//
//@Injectable()
//export class NoticeService {
//    private notices = [];
//
//    findAll() {
//        return this.notices;
//    }
//
//    findOne(id: number) {
//        return this.notices.find((notice: any) => notice.id === id);
//    }
//
//    create(body: any) {
//    const notice = {
//                id: Date.now(),
//                title: body.title,
//                content: body.content,
//                createdAt: new Date(),
//    };
//
//        this.notices.push(notice);
//
//        return notice;
//    }
//
//    update(id: number, body: any) {
//    const notice = this.findOne(id);
//
//        if (!notice) {
//            return { message: '공지사항을 찾을 수 없습니다.' };
//        }
//
//        notice.title = body.title;
//        notice.content = body.content;
//        notice.updatedAt = new Date();
//
//        return notice;
//    }
//
//    remove(id: number) {
//        this.notices = this.notices.filter((notice: any) => notice.id !== id);
//
//        return { message: '삭제되었습니다.' };
//    }
//}