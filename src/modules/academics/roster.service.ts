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
import { AuditService } from './audit.service';
import {
  RosterStatus,
  AcademicResultStatus,
  GradeCycle,
} from 'prisma/src/generated/prisma/enums';

@Injectable()
export class RosterService {
  constructor(
    private readonly cls: ClsService,
    private readonly db: TransactionHost<
      TransactionalAdapterPrisma<DatabaseService>
    >,
    private readonly databaseService: DatabaseService,
    private readonly auditService: AuditService,
  ) {}

  async checkCompletion(sectionId: string, periodId: string) {
    const tenantId = this.getTenantId();

    const section = await this.databaseService.section.findFirst({
      where: { id: sectionId, tenantId },
      include: {
        grade: { include: { subjects: true } },
        teacherAssignments: {
          include: { teacher: true, subject: true },
        },
      },
    });
    if (!section) throw new NotFoundException('Section not found');

    const enrolledStudents = await this.databaseService.studentGrade.count({
      where: { sectionId },
    });

    const slots = await this.databaseService.assessmentSlot.findMany({
      where: { gradeCycle: this.getGradeCycle(section.grade.grade), tenantId },
    });

    const results = [];
    const missing: string[] = [];

    for (const subject of section.grade.subjects) {
      for (const slot of slots) {
        const filledCount = await this.databaseService.academicResult.count({
          where: {
            sectionId,
            subjectId: subject.id,
            slotId: slot.id,
            periodId,
            status: AcademicResultStatus.SUBMITTED,
            tenantId,
          },
        });

        if (filledCount < enrolledStudents) {
          missing.push(`${subject.name} - ${slot.name}`);
        } else {
          results.push({
            subjectId: subject.id,
            slotId: slot.id,
            status: 'COMPLETE',
          });
        }
      }
    }

    return { complete: missing.length === 0, missing, results };
  }

  @Transactional()
  async generateRoster(sectionId: string, periodId: string) {
    const tenantId = this.getTenantId();

    const existing = await this.db.tx.academicRoster.findUnique({
      where: { sectionId_periodId: { sectionId, periodId } },
    });

    if (existing && existing.status !== RosterStatus.BUILDING) {
      throw new BadRequestException(
        `Roster already exists with status ${existing.status}`,
      );
    }

    const completion = await this.checkCompletion(sectionId, periodId);
    if (!completion.complete) {
      throw new BadRequestException(
        `Cannot generate roster: incomplete slots: ${completion.missing.join(', ')}`,
      );
    }

    if (existing) {
      const updated = await this.db.tx.academicRoster.update({
        where: { id: existing.id },
        data: { status: RosterStatus.COMPLETE },
      });
      return { data: updated };
    }

    const roster = await this.db.tx.academicRoster.create({
      data: {
        sectionId,
        periodId,
        status: RosterStatus.COMPLETE,
        tenantId,
      },
    });

    return { data: roster };
  }

  async getRoster(sectionId: string) {
    const tenantId = this.getTenantId();
    const roster = await this.databaseService.academicRoster.findFirst({
      where: { sectionId, tenantId },
      orderBy: { createdAt: 'desc' },
      include: {
        section: { include: { grade: true } },
        period: { include: { academicYear: true } },
      },
    });

    if (!roster) {
      return { data: null, message: 'No roster generated yet' };
    }

    const students = await this.databaseService.studentGrade.findMany({
      where: { sectionId },
      include: { student: true },
    });

    const subjects = await this.databaseService.subject.findMany({
      where: { gradeId: roster.section.gradeId },
    });

    const slots = await this.databaseService.assessmentSlot.findMany({
      where: { tenantId },
    });

    const results = await this.databaseService.academicResult.findMany({
      where: {
        sectionId,
        periodId: roster.periodId,
        tenantId,
      },
      orderBy: { createdAt: 'desc' },
    });

    const effectiveMap = new Map<string, number>();
    for (const r of results) {
      const key = `${r.studentId}_${r.subjectId}_${r.slotId}`;
      if (!effectiveMap.has(key)) {
        effectiveMap.set(key, r.score);
      }
    }

    const rows = students.map((sg) => {
      const row: any = {
        studentId: sg.student.id,
        studentName: `${sg.student.firstName} ${sg.student.lastName}`,
        studentCode: sg.studentCode,
      };

      for (const subject of subjects) {
        let total = 0;
        for (const slot of slots) {
          const score =
            effectiveMap.get(`${sg.student.id}_${subject.id}_${slot.id}`) ??
            null;
          row[`${subject.name}_${slot.name}`] = score;
          if (score !== null) total += score;
        }
        row[`${subject.name}_total`] = total;
      }

      return row;
    });

    return { data: { roster, rows } };
  }

  @Transactional()
  async approveRoster(id: string, approvedBy: string) {
    const tenantId = this.getTenantId();
    const roster = await this.db.tx.academicRoster.findFirst({
      where: { id, tenantId },
      include: { section: true },
    });
    if (!roster) throw new NotFoundException('Roster not found');
    if (roster.status !== RosterStatus.COMPLETE) {
      throw new BadRequestException(
        `Cannot approve roster with status ${roster.status}`,
      );
    }

    const updated = await this.db.tx.academicRoster.update({
      where: { id },
      data: {
        status: RosterStatus.APPROVED,
        approvedBy,
        approvedAt: new Date(),
      },
    });

    await this.auditService.log({
      action: 'ROSTER_APPROVE',
      performedBy: approvedBy,
      performedByRole: 'Principal',
      branchId: roster.section.branchId,
      sectionId: roster.sectionId,
    });

    return { data: updated };
  }

  @Transactional()
  async rejectRoster(id: string, note: string) {
    const tenantId = this.getTenantId();
    const roster = await this.db.tx.academicRoster.findFirst({
      where: { id, tenantId },
      include: { section: true },
    });
    if (!roster) throw new NotFoundException('Roster not found');

    const updated = await this.db.tx.academicRoster.update({
      where: { id },
      data: { status: RosterStatus.COMPLETE },
    });

    await this.auditService.log({
      action: 'ROSTER_REJECT',
      performedBy: '',
      performedByRole: 'Principal',
      branchId: roster.section.branchId,
      sectionId: roster.sectionId,
      reason: note,
    });

    return { data: updated, message: note };
  }

  @Transactional()
  async publish(
    dto: { sectionIds: string[]; periodId: string },
    publishedBy: string,
  ) {
    const tenantId = this.getTenantId();

    const result = await this.db.tx.academicRoster.updateMany({
      where: {
        sectionId: { in: dto.sectionIds },
        periodId: dto.periodId,
        status: RosterStatus.APPROVED,
        tenantId,
      },
      data: {
        status: RosterStatus.PUBLISHED,
        publishedBy,
        publishedAt: new Date(),
      },
    });

    return { data: { updated: result.count } };
  }

  private getGradeCycle(grade: number): GradeCycle {
    if (grade === 0) return GradeCycle.KG;
    if (grade <= 4) return GradeCycle.LOWER_PRIMARY;
    if (grade <= 8) return GradeCycle.UPPER_PRIMARY;
    return GradeCycle.SECONDARY;
  }

  private getTenantId(): string {
    return this.cls.get<string>(REQUEST_TENANT_ID)!;
  }
}
