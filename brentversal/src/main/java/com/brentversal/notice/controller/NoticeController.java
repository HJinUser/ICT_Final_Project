//import {
//        Body,
//        Controller,
//        Delete,
//        Get,
//        HttpCode,
//        HttpStatus,
//        Param,
//        ParseUUIDPipe,
//        Patch,
//        Post,
//        Query,
//        UseGuards,
//        } from '@nestjs/common';
//import {
//        ApiBearerAuth,
//        ApiOperation,
//        ApiResponse,
//        ApiTags,
//        } from '@nestjs/swagger';
//
//import { NoticeService } from './notice.service';
//import { CreateNoticeDto } from './dto/create-notice.dto';
//import { UpdateNoticeDto } from './dto/update-notice.dto';
//import { FindNoticesQueryDto } from './dto/find-notices-query.dto';
//import { ChangeNoticeStatusDto } from './dto/change-notice-status.dto';
//import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
//import { RolesGuard } from '../auth/guards/roles.guard';
//import { Roles } from '../auth/decorators/roles.decorator';
//import
//import com.brentversal.notice.service.NoticeService;
//import org.springframework.data.jpa.repository.Query;
//import org.springframework.data.repository.query.Param;
//import org.springframework.http.HttpStatus;
//import org.springframework.stereotype.Controller; { UserRole } from '../users/enums/user-role.enum';
//
//@ApiTags('공지사항')
//@Controller('notices')
//export class NoticeController {
//    constructor(private readonly noticeService:NoticeService) {}
//
//    /**
//     * 공개된 공지사항 목록
//     * - 중요 공지 우선
//     * - 검색, 카테고리, 대상 사용자 필터 지원
//     */
//    @Get()
//    @ApiOperation({ summary: '공지사항 목록 조회' })
//@ApiResponse({ status: 200, description: '공지사항 목록 반환' })
//findAll(@Query()query: FindNoticesQueryDto) {
//    return this.noticeService.findPublished(query);
//}
//
///**
// * 관리자용 공지사항 전체 목록
// * 주의: ":id" 경로보다 먼저 선언해야 합니다.
// */
//@Get('admin')
//@UseGuards(JwtAuthGuard, RolesGuard)
//@Roles(UserRole.ADMIN)
//@ApiBearerAuth()
//@ApiOperation({ summary: '관리자용 공지사항 전체 조회' })
//findAllForAdmin(@Query() query: FindNoticesQueryDto) {
//    return this.noticeService.findAllForAdmin(query);
//}
//
///**
// * 공지사항 등록
// */
//@Post()
//@UseGuards(JwtAuthGuard, RolesGuard)
//@Roles(UserRole.ADMIN)
//@ApiBearerAuth()
//@ApiOperation({ summary: '공지사항 등록' })
//@ApiResponse({ status: 201, description: '공지사항 등록 완료' })
//create(@Body() dto: CreateNoticeDto) {
//    return this.noticeService.create(dto);
//}
//
///**
// * 공지사항 게시/비공개 상태 변경
// */
//@Patch(':id/status')
//@UseGuards(JwtAuthGuard, RolesGuard)
//@Roles(UserRole.ADMIN)
//@ApiBearerAuth()
//@ApiOperation({ summary: '공지사항 게시 상태 변경' })
//changeStatus(
//        @Param('id', ParseUUIDPipe) id: string,
//        @Body() dto: ChangeNoticeStatusDto,
//        ) {
//    return this.noticeService.changeStatus(id, dto.status);
//}
//
///**
// * 공지사항 상단 고정/해제
// */
//@Patch(':id/pin')
//@UseGuards(JwtAuthGuard, RolesGuard)
//@Roles(UserRole.ADMIN)
//@ApiBearerAuth()
//@ApiOperation({ summary: '공지사항 상단 고정 상태 변경' })
//changePinned(
//        @Param('id', ParseUUIDPipe) id: string,
//        @Body('isPinned') isPinned: boolean,
//        ) {
//    return this.noticeService.changePinned(id, isPinned);
//}
//
///**
// * 공지사항 상세 조회
// */
//@Get(':id')
//@ApiOperation({ summary: '공지사항 상세 조회' })
//@ApiResponse({ status: 404, description: '공지사항을 찾을 수 없음' })
//findOne(@Param('id', ParseUUIDPipe) id: string) {
//    return this.noticeService.findPublishedOne(id);
//}
//
///**
// * 공지사항 수정
// */
//@Patch(':id')
//@UseGuards(JwtAuthGuard, RolesGuard)
//@Roles(UserRole.ADMIN)
//@ApiBearerAuth()
//@ApiOperation({ summary: '공지사항 수정' })
//update(
//        @Param('id', ParseUUIDPipe)id: string,
//        @Body()dto: UpdateNoticeDto,
//        ) {
//    return this.noticeService.update(id, dto);
//}
//
///**
// * 공지사항 삭제
// */
//@Delete(':id')
//@HttpCode(HttpStatus.NO_CONTENT)
//@UseGuards(JwtAuthGuard, RolesGuard)
//@Roles(UserRole.ADMIN)
//@ApiBearerAuth()
//@ApiOperation({ summary: '공지사항 삭제' })
//async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
//await this.noticeService.remove(id);
//  }
//          }