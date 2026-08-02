import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { Transactional, TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { DatabaseService } from '../database/database.service';
import { REQUEST_TENANT_ID } from '../auth/auth.constants';
import { TeacherScopeService } from '../teacher/teacher-scope.service';
import { TokenPayload } from '../auth/auth.types';
import { AuditService } from './audit.service';
import { RosterService } from './roster.service';
import { GradebookEntryBatchDto } from './dtos/gradebook-entry.dto';
import { SubmitResultsDto } from './dtos/submit-results.dto';
import { FallbackDto } from './dtos/fallback.dto';
import {
  CreateAssessmentSlotDto,
  UpdateAssessmentSlotDto,
  CreateSlotWindowDto,
  UpdateSlotWindowDto,
} from './dtos/assessment-slot.dto';
import { AcademicResultStatus, ProfileType } from 'prisma/src/generated/prisma/enums';

@Injectable()
export class AcademicsService {
  constructor(
    private readonly cls: ClsService,
    private readonly db: TransactionHost<
      TransactionalAdapterPrisma<DatabaseService>
    >,
    private readonly databaseService: DatabaseService,
    private readonly auditService: AuditService,
    private readonly rosterService: RosterService,
    private readonly teacherScopeService: TeacherScopeService,
  ) {}

  // ── Slot CRUD ──

  @Transactional()
  async createSlot(dto: CreateAssessmentSlotDto) {
    const tenantId = this.getTenantId();
    const slot = await this.db.tx.assessmentSlot.create({
      data: { ...dto, tenantId },
    });
    return { data: slot };
  }

  async findAllSlots() {
    const tenantId = this.getTenantId();
    const slots = await this.databaseService.assessmentSlot.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    });
    return { data: slots };
  }

  async findOneSlot(id: string) {
    const tenantId = this.getTenantId();
    const slot = await this.databaseService.assessmentSlot.findFirst({
      where: { id, tenantId },
    });
    if (!slot) throw new NotFoundException('Assessment slot not found');
    return { data: slot };
  }

  @Transactional()
  async updateSlot(id: string, dto: UpdateAssessmentSlotDto) {
    const tenantId = this.getTenantId();
    const slot = await this.db.tx.assessmentSlot.findFirst({
      where: { id, tenantId },
    });
    if (!slot) throw new NotFoundException('Assessment slot not found');

    const updated = await this.db.tx.assessmentSlot.update({
      where: { id },
      data: dto,
    });
    return { data: updated };
  }

  @Transactional()
  async removeSlot(id: string) {
    const tenantId = this.getTenantId();
    const slot = await this.db.tx.assessmentSlot.findFirst({
      where: { id, tenantId },
    });
    if (!slot) throw new NotFoundException('Assessment slot not found');
    await this.db.tx.assessmentSlot.delete({ where: { id } });
    return { message: 'Assessment slot deleted' };
  }

  // ── Slot Window CRUD ──

  @Transactional()
  async createSlotWindow(dto: CreateSlotWindowDto) {
    const tenantId = this.getTenantId();

    const existing = await this.db.tx.assessmentSlotWindow.findUnique({
      where: {
        slotId_branchId: { slotId: dto.slotId, branchId: dto.branchId },
      },
    });
    if (existing) {
      throw new BadRequestException(
        'Window already exists for this slot+branch',
      );
    }

    const window = await this.db.tx.assessmentSlotWindow.create({
      data: {
        slotId: dto.slotId,
        branchId: dto.branchId,
        isScheduled: dto.isScheduled,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        assessmentPeriodStart: dto.assessmentPeriodStart
          ? new Date(dto.assessmentPeriodStart)
          : null,
        assessmentPeriodEnd: dto.assessmentPeriodEnd
          ? new Date(dto.assessmentPeriodEnd)
          : null,
        tenantId,
      },
    });
    return { data: window };
  }

  async findAllSlotWindows(branchId?: string) {
    const tenantId = this.getTenantId();
    const where: any = { tenantId };
    if (branchId) where.branchId = branchId;

    const windows = await this.databaseService.assessmentSlotWindow.findMany({
      where,
      include: { slot: true },
    });
    return { data: windows };
  }

  @Transactional()
  async updateSlotWindow(id: string, dto: UpdateSlotWindowDto) {
    const tenantId = this.getTenantId();
    const existing = await this.db.tx.assessmentSlotWindow.findFirst({
      where: { id, tenantId },
    });
    if (!existing) throw new NotFoundException('Slot window not found');

    const data: any = {};
    if (dto.isScheduled !== undefined) data.isScheduled = dto.isScheduled;
    if (dto.startDate !== undefined)
      data.startDate = dto.startDate ? new Date(dto.startDate) : null;
    if (dto.endDate !== undefined)
      data.endDate = dto.endDate ? new Date(dto.endDate) : null;
    if (dto.assessmentPeriodStart !== undefined)
      data.assessmentPeriodStart = dto.assessmentPeriodStart
        ? new Date(dto.assessmentPeriodStart)
        : null;
    if (dto.assessmentPeriodEnd !== undefined)
      data.assessmentPeriodEnd = dto.assessmentPeriodEnd
        ? new Date(dto.assessmentPeriodEnd)
        : null;

    const updated = await this.db.tx.assessmentSlotWindow.update({
      where: { id },
      data,
    });
    return { data: updated };
  }

  // ── Teacher Assignment ──

  @Transactional()
  async assignTeacher(dto: {
    teacherId: string;
    sectionId: string;
    subjectId: string;
    isHomeroom?: boolean;
  }) {
    const tenantId = this.getTenantId();

    const existing = await this.db.tx.teacherSectionSubject.findUnique({
      where: {
        sectionId_subjectId: {
          sectionId: dto.sectionId,
          subjectId: dto.subjectId,
        },
      },
    });
    if (existing) {
      throw new BadRequestException(
        'This subject already has a teacher assigned in this section',
      );
    }

    const assignment = await this.db.tx.teacherSectionSubject.create({
      data: {
        teacherId: dto.teacherId,
        sectionId: dto.sectionId,
        subjectId: dto.subjectId,
        isHomeroom: dto.isHomeroom ?? false,
        tenantId,
      },
      include: { teacher: true, section: true, subject: true },
    });

    return { data: assignment };
  }

  async findAllAssignments(sectionId?: string) {
    const tenantId = this.getTenantId();
    const where: any = { tenantId };
    if (sectionId) where.sectionId = sectionId;

    const assignments =
      await this.databaseService.teacherSectionSubject.findMany({
        where,
        include: { teacher: true, section: true, subject: true },
        orderBy: { sectionId: 'asc' },
      });
    return { data: assignments };
  }

  @Transactional()
  async removeAssignment(id: string) {
    const tenantId = this.getTenantId();
    const assignment = await this.db.tx.teacherSectionSubject.findFirst({
      where: { id, tenantId },
    });
    if (!assignment) throw new NotFoundException('Assignment not found');
    await this.db.tx.teacherSectionSubject.delete({ where: { id } });
    return { message: 'Assignment removed' };
  }

  // ── Gradebook Entry ──

  @Transactional()
  async gradebookEntry(dto: GradebookEntryBatchDto, user: TokenPayload) {
    const tenantId = this.getTenantId();

    await this.teacherScopeService.assertSectionSubjectAccess(
      user,
      dto.sectionId,
      dto.subjectId,
    );

    await this.assertPeriod(dto.periodId);

    const section = await this.db.tx.section.findFirst({
      where: { id: dto.sectionId, tenantId },
    });
    if (!section) throw new NotFoundException('Section not found');

    const studentIds = dto.entries.map((e) => e.studentId);
    const enrolledCount = await this.db.tx.studentGrade.count({
      where: { studentId: { in: studentIds }, sectionId: dto.sectionId },
    });
    if (enrolledCount !== studentIds.length) {
      throw new BadRequestException(
        'One or more students not enrolled in this section',
      );
    }

    for (const entry of dto.entries) {
      const existing = await this.db.tx.academicResult.findFirst({
        where: {
          studentId: entry.studentId,
          subjectId: dto.subjectId,
          slotId: dto.slotId,
          sectionId: dto.sectionId,
          periodId: dto.periodId,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (existing && existing.status === AcademicResultStatus.SUBMITTED) {
        throw new BadRequestException(
          `Result already submitted for student ${entry.studentId}. Use correction flow.`,
        );
      }

      const previousValue = existing?.score ?? null;

      if (existing) {
        await this.db.tx.academicResult.update({
          where: { id: existing.id },
          data: { score: entry.score },
        });
      } else {
        await this.db.tx.academicResult.create({
          data: {
            score: entry.score,
            status: AcademicResultStatus.DRAFT,
            periodId: dto.periodId,
            studentId: entry.studentId,
            subjectId: dto.subjectId,
            slotId: dto.slotId,
            sectionId: dto.sectionId,
            tenantId,
          },
        });
      }

      await this.auditService.log({
        action: previousValue === null ? 'SCORE_CREATE' : 'SCORE_UPDATE',
        performedBy: user.profileId!,
        performedByRole: 'Teacher',
        branchId: section.branchId,
        sectionId: dto.sectionId,
        subjectId: dto.subjectId,
        slotId: dto.slotId,
        studentId: entry.studentId,
        previousValue: previousValue ?? undefined,
        newValue: entry.score,
      });
    }

    return this.getGradebook(
      dto.sectionId,
      dto.subjectId,
      dto.slotId,
      dto.periodId,
      user,
    );
  }

  async getGradebook(
    sectionId: string,
    subjectId: string,
    slotId: string,
    periodId: string,
    user?: TokenPayload,
  ) {
    const tenantId = this.getTenantId();

    await this.teacherScopeService.assertSectionSubjectAccess(
      user!,
      sectionId,
      subjectId,
    );

    const students = await this.databaseService.studentGrade.findMany({
      where: { sectionId },
      include: { student: true },
      orderBy: { studentCode: 'asc' },
    });

    const results = await this.databaseService.academicResult.findMany({
      where: {
        sectionId,
        subjectId,
        slotId,
        periodId,
        tenantId,
      },
      orderBy: { createdAt: 'desc' },
    });

    const effectiveMap = new Map<string, (typeof results)[0]>();
    for (const r of results) {
      const key = `${r.studentId}`;
      if (!effectiveMap.has(key)) {
        effectiveMap.set(key, r);
      }
    }

    const rows = students.map((sg) => {
      const result = effectiveMap.get(sg.student.id);
      return {
        studentId: sg.student.id,
        studentName: `${sg.student.firstName} ${sg.student.lastName}`,
        studentCode: sg.studentCode,
        score: result?.score ?? null,
        status: result?.status ?? null,
        resultId: result?.id ?? null,
      };
    });

    return { data: { sectionId, subjectId, slotId, periodId, entries: rows } };
  }

  @Transactional()
  async submitResults(dto: SubmitResultsDto, user: TokenPayload) {
    const tenantId = this.getTenantId();

    await this.teacherScopeService.assertSectionSubjectAccess(
      user,
      dto.sectionId,
      dto.subjectId,
    );

    await this.assertPeriod(dto.periodId);

    const section = await this.db.tx.section.findFirst({
      where: { id: dto.sectionId, tenantId },
    });
    if (!section) throw new NotFoundException('Section not found');

    const drafts = await this.db.tx.academicResult.findMany({
      where: {
        sectionId: dto.sectionId,
        subjectId: dto.subjectId,
        slotId: dto.slotId,
        periodId: dto.periodId,
        status: AcademicResultStatus.DRAFT,
        tenantId,
      },
    });

    if (drafts.length === 0) {
      throw new BadRequestException('No draft results found to submit');
    }

    await this.db.tx.academicResult.updateMany({
      where: {
        id: { in: drafts.map((r) => r.id) },
      },
      data: {
        status: AcademicResultStatus.SUBMITTED,
        submittedBy: user.profileId!,
        submittedAt: new Date(),
      },
    });

    await this.auditService.log({
      action: 'SCORE_SUBMIT',
      performedBy: user.profileId!,
      performedByRole: 'Teacher',
      branchId: section.branchId,
      sectionId: dto.sectionId,
      subjectId: dto.subjectId,
      slotId: dto.slotId,
    });

    const completion = await this.rosterService.checkCompletion(
      dto.sectionId,
      dto.periodId,
    );
    if (completion.complete) {
      await this.rosterService.generateRoster(dto.sectionId, dto.periodId);
    }

    return this.getGradebook(
      dto.sectionId,
      dto.subjectId,
      dto.slotId,
      dto.periodId,
      user,
    );
  }

  @Transactional()
  async vpFallback(dto: FallbackDto, profileId: string) {
    const tenantId = this.getTenantId();

    await this.assertPeriod(dto.periodId);

    const section = await this.db.tx.section.findFirst({
      where: { id: dto.sectionId, tenantId },
    });
    if (!section) throw new NotFoundException('Section not found');

    const existing = await this.db.tx.academicResult.findFirst({
      where: {
        studentId: dto.studentId,
        subjectId: dto.subjectId,
        slotId: dto.slotId,
        sectionId: dto.sectionId,
        periodId: dto.periodId,
        tenantId,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existing && existing.status === AcademicResultStatus.SUBMITTED) {
      throw new BadRequestException('Result already submitted');
    }

    if (existing) {
      await this.db.tx.academicResult.update({
        where: { id: existing.id },
        data: {
          score: dto.score,
          status: AcademicResultStatus.SUBMITTED,
          submittedBy: profileId,
          submittedAt: new Date(),
          isVpFallback: true,
          vpFallbackBy: profileId,
        },
      });
    } else {
      await this.db.tx.academicResult.create({
        data: {
          score: dto.score,
          status: AcademicResultStatus.SUBMITTED,
          periodId: dto.periodId,
          studentId: dto.studentId,
          subjectId: dto.subjectId,
          slotId: dto.slotId,
          sectionId: dto.sectionId,
          submittedBy: profileId,
          submittedAt: new Date(),
          isVpFallback: true,
          vpFallbackBy: profileId,
          tenantId,
        },
      });
    }

    await this.auditService.log({
      action: 'VP_FALLBACK',
      performedBy: profileId,
      performedByRole: 'VicePrincipal',
      branchId: section.branchId,
      sectionId: dto.sectionId,
      subjectId: dto.subjectId,
      slotId: dto.slotId,
      studentId: dto.studentId,
      newValue: dto.score,
    });

    const completion = await this.rosterService.checkCompletion(
      dto.sectionId,
      dto.periodId,
    );
    if (completion.complete) {
      await this.rosterService.generateRoster(dto.sectionId, dto.periodId);
    }

    return { data: { message: 'Fallback submission recorded' } };
  }

  // ── Corrections (post-publish) ──

  @Transactional()
  async requestCorrection(
    dto: { resultId: string; reason: string; newScore: number },
    user: TokenPayload,
  ) {
    const tenantId = this.getTenantId();
    const result = await this.db.tx.academicResult.findFirst({
      where: { id: dto.resultId, tenantId },
      include: { section: true },
    });
    if (!result) throw new NotFoundException('Academic result not found');

    await this.teacherScopeService.assertSectionSubjectAccess(
      user,
      result.sectionId,
      result.subjectId,
    );

    const correction = await this.db.tx.academicCorrection.create({
      data: {
        resultId: dto.resultId,
        reason: dto.reason,
        newScore: dto.newScore,
        requestedBy: user.profileId!,
        tenantId,
      },
    });

    await this.auditService.log({
      action: 'CORRECTION_REQUEST',
      performedBy: user.profileId!,
      performedByRole: 'Teacher',
      branchId: result.section.branchId,
      sectionId: result.sectionId,
      subjectId: result.subjectId,
      slotId: result.slotId,
      studentId: result.studentId,
      previousValue: result.score,
      newValue: dto.newScore,
      reason: dto.reason,
      resultId: result.id,
    });

    return { data: correction };
  }

  async listCorrections(status?: string) {
    const tenantId = this.getTenantId();
    const where: any = { tenantId };
    if (status) where.status = status;

    const corrections = await this.databaseService.academicCorrection.findMany({
      where,
      include: {
        result: { include: { student: true, subject: true, slot: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return { data: corrections };
  }

  @Transactional()
  async approveCorrection(id: string, approvedBy: string) {
    const tenantId = this.getTenantId();
    const correction = await this.db.tx.academicCorrection.findFirst({
      where: { id, tenantId },
      include: { result: { include: { section: true } } },
    });
    if (!correction)
      throw new NotFoundException('Correction request not found');
    if (correction.status !== 'PENDING') {
      throw new BadRequestException('Correction already processed');
    }

    await this.db.tx.academicCorrection.update({
      where: { id },
      data: {
        status: 'APPROVED' as any,
        approvedBy,
        approvedAt: new Date(),
      },
    });

    await this.db.tx.academicResult.update({
      where: { id: correction.resultId },
      data: { score: correction.newScore },
    });

    await this.auditService.log({
      action: 'CORRECTION_APPROVE',
      performedBy: approvedBy,
      performedByRole: 'Principal',
      branchId: correction.result.section.branchId,
      sectionId: correction.result.sectionId,
      subjectId: correction.result.subjectId,
      slotId: correction.result.slotId,
      studentId: correction.result.studentId,
      previousValue: correction.result.score,
      newValue: correction.newScore,
      reason: correction.reason,
      resultId: correction.result.id,
    });

    return { data: correction };
  }

  @Transactional()
  async rejectCorrection(id: string, note: string) {
    const tenantId = this.getTenantId();
    const correction = await this.db.tx.academicCorrection.findFirst({
      where: { id, tenantId },
    });
    if (!correction)
      throw new NotFoundException('Correction request not found');

    await this.db.tx.academicCorrection.update({
      where: { id },
      data: { status: 'REJECTED' as any, rejectionNote: note },
    });

    return { data: correction };
  }

  private getTenantId(): string {
    return this.cls.get<string>(REQUEST_TENANT_ID)!;
  }

  private async assertPeriod(periodId: string) {
    const tenantId = this.getTenantId();
    const period = await this.db.tx.academicPeriod.findFirst({
      where: { id: periodId, tenantId },
    });
    if (!period) {
      throw new BadRequestException('Invalid academic period for this tenant');
    }
    return period;
  }
}
