import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query, Req,
} from '@nestjs/common';
import { AcademicsService } from './academics.service';
import { RosterService } from './roster.service';
import { GradingService } from './grading.service';
import { AuditService } from './audit.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { ProfileType } from 'prisma/src/generated/prisma/enums';
import { TokenPayload } from '../auth/auth.types';
import { CreateAssessmentSlotDto, UpdateAssessmentSlotDto, CreateSlotWindowDto, UpdateSlotWindowDto } from './dtos/assessment-slot.dto';
import { GradebookEntryBatchDto } from './dtos/gradebook-entry.dto';
import { SubmitResultsDto } from './dtos/submit-results.dto';
import { FallbackDto } from './dtos/fallback.dto';
import { ApproveRosterDto, RejectRosterDto, PublishRosterDto } from './dtos/roster-action.dto';
import { CorrectionRequestDto, ApproveCorrectionDto, RejectCorrectionDto } from './dtos/correction.dto';
import { CreateGradingRuleDto, UpdateGradingRuleDto } from './dtos/grading-rule.dto';

@Controller('academics')
export class AcademicsController {
  constructor(
    private readonly academicsService: AcademicsService,
    private readonly rosterService: RosterService,
    private readonly gradingService: GradingService,
    private readonly auditService: AuditService,
  ) {}

  // ── Assessment Slots ──

  @Roles(ProfileType.Owner)
  @Post('config/slots')
  createSlot(@Body() dto: CreateAssessmentSlotDto) {
    return this.academicsService.createSlot(dto);
  }

  @Roles(ProfileType.Owner, ProfileType.Principal)
  @Get('config/slots')
  findAllSlots() {
    return this.academicsService.findAllSlots();
  }

  @Roles(ProfileType.Owner, ProfileType.Principal)
  @Get('config/slots/:id')
  findOneSlot(@Param('id') id: string) {
    return this.academicsService.findOneSlot(id);
  }

  @Roles(ProfileType.Owner)
  @Patch('config/slots/:id')
  updateSlot(@Param('id') id: string, @Body() dto: UpdateAssessmentSlotDto) {
    return this.academicsService.updateSlot(id, dto);
  }

  @Roles(ProfileType.Owner)
  @Delete('config/slots/:id')
  removeSlot(@Param('id') id: string) {
    return this.academicsService.removeSlot(id);
  }

  // ── Slot Windows ──

  @Roles(ProfileType.Principal)
  @Post('config/slot-windows')
  createSlotWindow(@Body() dto: CreateSlotWindowDto) {
    return this.academicsService.createSlotWindow(dto);
  }

  @Roles(ProfileType.Principal, ProfileType.VicePrincipal)
  @Get('config/slot-windows')
  findAllSlotWindows(@Query('branchId') branchId?: string) {
    return this.academicsService.findAllSlotWindows(branchId);
  }

  @Roles(ProfileType.Principal)
  @Patch('config/slot-windows/:id')
  updateSlotWindow(@Param('id') id: string, @Body() dto: UpdateSlotWindowDto) {
    return this.academicsService.updateSlotWindow(id, dto);
  }

  // ── Teacher Assignments ──

  @Roles(ProfileType.Principal)
  @Post('config/assignments')
  assignTeacher(
    @Body() dto: { teacherId: string; sectionId: string; subjectId: string; isHomeroom?: boolean },
  ) {
    return this.academicsService.assignTeacher(dto);
  }

  @Roles(ProfileType.Principal, ProfileType.VicePrincipal)
  @Get('config/assignments')
  findAllAssignments(@Query('sectionId') sectionId?: string) {
    return this.academicsService.findAllAssignments(sectionId);
  }

  @Roles(ProfileType.Principal)
  @Delete('config/assignments/:id')
  removeAssignment(@Param('id') id: string) {
    return this.academicsService.removeAssignment(id);
  }

  // ── Grading Rules ──

  @Roles(ProfileType.Owner)
  @Post('config/grading-rules')
  createRule(@Body() dto: CreateGradingRuleDto) {
    return this.gradingService.createRule(dto);
  }

  @Roles(ProfileType.Owner, ProfileType.Principal)
  @Get('config/grading-rules')
  findAllRules() {
    return this.gradingService.findAllRules();
  }

  @Roles(ProfileType.Owner, ProfileType.Principal)
  @Get('config/grading-rules/:id')
  findOneRule(@Param('id') id: string) {
    return this.gradingService.findOneRule(id);
  }

  @Roles(ProfileType.Owner)
  @Patch('config/grading-rules/:id')
  updateRule(@Param('id') id: string, @Body() dto: UpdateGradingRuleDto) {
    return this.gradingService.updateRule(id, dto);
  }

  @Roles(ProfileType.Owner)
  @Delete('config/grading-rules/:id')
  removeRule(@Param('id') id: string) {
    return this.gradingService.removeRule(id);
  }

  // ── Gradebook Entry ──

  @Roles(ProfileType.Teacher, ProfileType.Principal)
  @Post('results/entry')
  gradebookEntry(@Body() dto: GradebookEntryBatchDto, @Req() req: { user: TokenPayload }) {
    return this.academicsService.gradebookEntry(dto, req.user.profileId!);
  }

  @Roles(ProfileType.Teacher, ProfileType.Principal)
  @Post('results/submit')
  submitResults(@Body() dto: SubmitResultsDto, @Req() req: { user: TokenPayload }) {
    return this.academicsService.submitResults(dto, req.user.profileId!);
  }

  @Roles(ProfileType.Teacher, ProfileType.Principal, ProfileType.VicePrincipal)
  @Get('results/:sectionId')
  getGradebook(
    @Param('sectionId') sectionId: string,
    @Query('subjectId') subjectId: string,
    @Query('slotId') slotId: string,
    @Query('term') term: string,
  ) {
    return this.academicsService.getGradebook(sectionId, subjectId, slotId, term);
  }

  @Roles(ProfileType.VicePrincipal)
  @Post('results/fallback')
  vpFallback(@Body() dto: FallbackDto, @Req() req: { user: TokenPayload }) {
    return this.academicsService.vpFallback(dto, req.user.profileId!);
  }

  // ── Rosters ──

  @Roles(ProfileType.Principal, ProfileType.VicePrincipal)
  @Get('rosters/:sectionId')
  getRoster(@Param('sectionId') sectionId: string) {
    return this.rosterService.getRoster(sectionId);
  }

  @Roles(ProfileType.Principal)
  @Post('rosters/:id/approve')
  approveRoster(@Param('id') id: string, @Req() req: { user: TokenPayload }) {
    return this.rosterService.approveRoster(id, req.user.profileId!);
  }

  @Roles(ProfileType.Principal)
  @Post('rosters/:id/reject')
  rejectRoster(@Param('id') id: string, @Body() dto: RejectRosterDto) {
    return this.rosterService.rejectRoster(id, dto.note);
  }

  @Roles(ProfileType.Principal)
  @Post('rosters/publish')
  publishRoster(@Body() dto: PublishRosterDto, @Req() req: { user: TokenPayload }) {
    return this.rosterService.publish(dto, req.user.profileId!);
  }

  // ── Corrections ──

  @Roles(ProfileType.Teacher, ProfileType.Principal)
  @Post('corrections')
  requestCorrection(@Body() dto: CorrectionRequestDto, @Req() req: { user: TokenPayload }) {
    return this.academicsService.requestCorrection(dto, req.user.profileId!);
  }

  @Roles(ProfileType.Principal)
  @Get('corrections')
  listCorrections(@Query('status') status?: string) {
    return this.academicsService.listCorrections(status);
  }

  @Roles(ProfileType.Principal)
  @Post('corrections/:id/approve')
  approveCorrection(@Param('id') id: string, @Req() req: { user: TokenPayload }) {
    return this.academicsService.approveCorrection(id, req.user.profileId!);
  }

  @Roles(ProfileType.Principal)
  @Post('corrections/:id/reject')
  rejectCorrection(@Param('id') id: string, @Body() dto: RejectCorrectionDto) {
    return this.academicsService.rejectCorrection(id, dto.note);
  }

  // ── Audit Log ──

  @Roles(ProfileType.Principal, ProfileType.VicePrincipal, ProfileType.Owner)
  @Get('audit')
  queryAudit(
    @Query('action') action?: string,
    @Query('branchId') branchId?: string,
    @Query('sectionId') sectionId?: string,
    @Query('studentId') studentId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('limit') limit?: string,
  ) {
    return this.auditService.findAll({
      action, branchId, sectionId, studentId, dateFrom, dateTo, limit: limit ? parseInt(limit) : undefined,
    });
  }

  // ── Completion Check (utility) ──

  @Roles(ProfileType.Principal, ProfileType.VicePrincipal)
  @Get('completion/:sectionId')
  checkCompletion(
    @Param('sectionId') sectionId: string,
    @Query('term') term: string,
  ) {
    return this.rosterService.checkCompletion(sectionId, term);
  }

  // ── Roster Generation (manual trigger) ──

  @Roles(ProfileType.Principal)
  @Post('rosters/generate/:sectionId')
  generateRoster(
    @Param('sectionId') sectionId: string,
    @Query('term') term: string,
    @Query('year') year: string,
  ) {
    return this.rosterService.generateRoster(sectionId, term, year);
  }
}
