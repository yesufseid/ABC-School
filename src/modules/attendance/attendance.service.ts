import { ClsService } from 'nestjs-cls';
import { Transactional, TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { REQUEST_TENANT_ID } from '../auth/auth.constants';
import { TeacherScopeService } from '../teacher/teacher-scope.service';
import { TokenPayload } from '../auth/auth.types';
import { TakeAttendanceDto } from './dtos/take-attendance.dto';
import { CorrectAttendanceDto } from './dtos/correct-attendance.dto';

@Injectable()
export class AttendanceService {
  constructor(
    private readonly cls: ClsService,
    private readonly db: TransactionHost<
      TransactionalAdapterPrisma<DatabaseService>
    >,
    private readonly databaseService: DatabaseService,
    private readonly teacherScopeService: TeacherScopeService,
  ) {}

  @Transactional()
  async take(dto: TakeAttendanceDto, user: TokenPayload) {
    const tenantId = this.getTenantId();

    await this.teacherScopeService.assertSectionAccess(user, dto.sectionId);

    const section = await this.db.tx.section.findFirst({
      where: { id: dto.sectionId, tenantId },
    });
    if (!section) throw new NotFoundException('Section not found');

    const date = new Date(dto.date);
    date.setHours(0, 0, 0, 0);
    if (date > new Date()) {
      throw new BadRequestException('Cannot mark attendance for future dates');
    }

    const studentIds = dto.entries.map((e) => e.studentId);
    const enrolledCount = await this.db.tx.studentGrade.count({
      where: { studentId: { in: studentIds }, sectionId: dto.sectionId },
    });
    if (enrolledCount !== studentIds.length) {
      throw new BadRequestException(
        'One or more students are not enrolled in this section',
      );
    }

    for (const entry of dto.entries) {
      const existing = await this.db.tx.attendanceRecord.findFirst({
        where: {
          studentId: entry.studentId,
          date,
          originalRecordId: null,
          tenantId,
        },
      });

      if (existing) {
        await this.db.tx.attendanceRecord.update({
          where: { id: existing.id },
          data: { status: entry.status, note: entry.note, markedBy: user.profileId! },
        });
      } else {
        await this.db.tx.attendanceRecord.create({
          data: {
            date,
            status: entry.status,
            note: entry.note,
            studentId: entry.studentId,
            sectionId: dto.sectionId,
            markedBy: user.profileId!,
            tenantId,
          },
        });
      }
    }

    return this.getSectionSheet(dto.sectionId, dto.date, user);
  }

  async getSectionSheet(sectionId: string, dateStr: string, user?: TokenPayload) {
    const tenantId = this.getTenantId();

    await this.teacherScopeService.assertSectionAccess(user!, sectionId);

    const section = await this.databaseService.section.findFirst({
      where: { id: sectionId, tenantId },
      include: { grade: true },
    });
    if (!section) throw new NotFoundException('Section not found');

    const date = new Date(dateStr);
    date.setHours(0, 0, 0, 0);

    const students = await this.databaseService.studentGrade.findMany({
      where: { sectionId, grade: section.grade.grade },
      include: { student: true },
    });

    const records = await this.databaseService.attendanceRecord.findMany({
      where: { sectionId, date, tenantId },
      orderBy: { createdAt: 'desc' },
    });

    const effectiveMap = new Map<string, (typeof records)[0]>();
    for (const r of records) {
      const key = `${r.studentId}`;
      if (!effectiveMap.has(key)) {
        effectiveMap.set(key, r);
      }
    }

    const sheet = students.map((sg) => {
      const record = effectiveMap.get(sg.studentId);
      return {
        studentId: sg.student.id,
        studentName: `${sg.student.firstName} ${sg.student.lastName}`,
        studentCode: sg.studentCode,
        status: record?.status ?? null,
        note: record?.note ?? null,
        attendanceId: record?.id ?? null,
      };
    });

    return { data: { section: { id: section.id, name: section.name, grade: section.grade.grade }, date: dateStr, entries: sheet } };
  }

  async getHistory(studentId: string, year?: string) {
    const tenantId = this.getTenantId();

    const where: any = { studentId, tenantId };
    if (year) {
      const yearStart = new Date(`${year}-01-01`);
      const yearEnd = new Date(`${year}-12-31`);
      where.date = { gte: yearStart, lte: yearEnd };
    }

    const allRecords = await this.databaseService.attendanceRecord.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const effectiveMap = new Map<string, (typeof allRecords)[0]>();
    for (const r of allRecords) {
      const key = `${r.studentId}_${r.date.toISOString().split('T')[0]}`;
      if (!effectiveMap.has(key)) {
        effectiveMap.set(key, r);
      }
    }

    const sorted = Array.from(effectiveMap.values()).sort(
      (a, b) => a.date.getTime() - b.date.getTime(),
    );

    let present = 0;
    let absent = 0;
    let late = 0;
    let excused = 0;

    const timeline = sorted.map((r) => {
      switch (r.status) {
        case 'PRESENT': present++; break;
        case 'ABSENT': absent++; break;
        case 'LATE': late++; break;
        case 'EXCUSED': excused++; break;
      }
      return {
        date: r.date.toISOString().split('T')[0],
        status: r.status,
        note: r.note,
        running: { present, absent, late, excused, total: present + absent + late + excused },
      };
    });

    return {
      data: {
        studentId,
        timeline,
        totals: { present, absent, late, excused, total: present + absent + late + excused },
      },
    };
  }

  async getStatistics(query: {
    branchId?: string;
    gradeId?: string;
    sectionId?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const tenantId = this.getTenantId();

    const sectionWhere: any = { tenantId };
    if (query.branchId) sectionWhere.branchId = query.branchId;
    if (query.gradeId) sectionWhere.gradeId = query.gradeId;
    if (query.sectionId) sectionWhere.id = query.sectionId;

    const sections = await this.databaseService.section.findMany({
      where: sectionWhere,
      select: { id: true },
    });
    const sectionIds = sections.map((s) => s.id);
    if (sectionIds.length === 0) {
      return { data: { summary: [], totals: { present: 0, absent: 0, late: 0, excused: 0, unmarked: 0 } } };
    }

    const dateFilter: any = {};
    if (query.dateFrom) dateFilter.gte = new Date(query.dateFrom);
    if (query.dateTo) dateFilter.lte = new Date(query.dateTo);

    const where: any = { tenantId, sectionId: { in: sectionIds } };
    if (Object.keys(dateFilter).length > 0) where.date = dateFilter;

    const records = await this.databaseService.attendanceRecord.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const effectiveMap = new Map<string, (typeof records)[0]>();
    for (const r of records) {
      const key = `${r.sectionId}_${r.studentId}_${r.date.toISOString().split('T')[0]}`;
      if (!effectiveMap.has(key)) {
        effectiveMap.set(key, r);
      }
    }

    let present = 0;
    let absent = 0;
    let late = 0;
    let excused = 0;

    for (const r of effectiveMap.values()) {
      switch (r.status) {
        case 'PRESENT': present++; break;
        case 'ABSENT': absent++; break;
        case 'LATE': late++; break;
        case 'EXCUSED': excused++; break;
      }
    }

    const total = present + absent + late + excused;
    const rate = total > 0 ? Math.round((present / total) * 100) : 0;

    return {
      data: {
        summary: {
          present,
          absent,
          late,
          excused,
          total,
          attendanceRate: rate,
        },
        sectionIds,
      },
    };
  }

  @Transactional()
  async directEdit(
    id: string,
    dto: { status: string; note?: string },
    user: TokenPayload,
  ) {
    const tenantId = this.getTenantId();
    const record = await this.db.tx.attendanceRecord.findFirst({
      where: { id, tenantId, originalRecordId: null },
    });
    if (!record) throw new NotFoundException('Attendance record not found');

    await this.teacherScopeService.assertSectionAccess(user, record.sectionId);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const recordDate = new Date(record.date);
    recordDate.setHours(0, 0, 0, 0);

    if (recordDate.getTime() !== today.getTime()) {
      throw new BadRequestException(
        'Direct edit only allowed for same-day records. Use correction endpoint for past dates.',
      );
    }

    const updated = await this.db.tx.attendanceRecord.update({
      where: { id },
      data: { status: dto.status as any, note: dto.note, markedBy: user.profileId! },
    });

    return { data: updated };
  }

  @Transactional()
  async correct(
    id: string,
    dto: CorrectAttendanceDto,
    user: TokenPayload,
  ) {
    const tenantId = this.getTenantId();
    const original = await this.db.tx.attendanceRecord.findFirst({
      where: { id, tenantId, originalRecordId: null },
    });
    if (!original) throw new NotFoundException('Original attendance record not found');

    await this.teacherScopeService.assertSectionAccess(user, original.sectionId);

    const daysSince = Math.floor(
      (Date.now() - original.createdAt.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysSince > 3 && !dto.approvedBy) {
      throw new BadRequestException(
        'Correction beyond 3 days requires Owner-level approval (approvedBy)',
      );
    }

    const correction = await this.db.tx.attendanceRecord.create({
      data: {
        date: original.date,
        status: dto.newStatus,
        note: original.note,
        studentId: original.studentId,
        sectionId: original.sectionId,
        markedBy: original.markedBy,
        originalRecordId: original.id,
        correctionReason: dto.reason,
        correctedBy: user.profileId!,
        tenantId,
      },
    });

    return { data: correction };
  }

  private getTenantId(): string {
    return this.cls.get<string>(REQUEST_TENANT_ID)!;
  }
}
