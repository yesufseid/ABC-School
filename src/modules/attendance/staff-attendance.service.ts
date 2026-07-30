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
import { CheckInDto } from './dtos/check-in.dto';
import { CheckOutDto } from './dtos/check-out.dto';
import { AttendanceStatus } from 'prisma/src/generated/prisma/enums';

@Injectable()
export class StaffAttendanceService {
  constructor(
    private readonly cls: ClsService,
    private readonly db: TransactionHost<
      TransactionalAdapterPrisma<DatabaseService>
    >,
    private readonly databaseService: DatabaseService,
  ) {}

  @Transactional()
  async checkIn(dto: CheckInDto, profileId: string) {
    const tenantId = this.getTenantId();

    const profile = await this.db.tx.profile.findUnique({
      where: { id: profileId },
    });
    if (!profile) throw new NotFoundException('Profile not found');

    let branchId = dto.branchId;
    if (!branchId) {
      const teacher = await this.db.tx.teacher.findUnique({
        where: { profileId },
        select: { branchId: true },
      });
      if (teacher) {
        branchId = teacher.branchId;
      } else {
        const staff = await this.db.tx.staff.findUnique({
          where: { profileId },
          select: { branchId: true },
        });
        if (staff) {
          branchId = staff.branchId;
        }
      }
    }
    if (!branchId) throw new BadRequestException('Could not determine branch');

    const now = dto.timestamp ? new Date(dto.timestamp) : new Date();
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);

    let attendance = await this.db.tx.staffAttendance.findUnique({
      where: { profileId_date: { profileId, date: dayStart } },
    });

    if (attendance) {
      attendance = await this.db.tx.staffAttendance.update({
        where: { id: attendance.id },
        data: { checkIn: now, status: AttendanceStatus.PRESENT },
      });
    } else {
      attendance = await this.db.tx.staffAttendance.create({
        data: {
          date: dayStart,
          status: AttendanceStatus.PRESENT,
          checkIn: now,
          profileId,
          branchId,
          tenantId,
        },
      });
    }

    return { data: attendance };
  }

  @Transactional()
  async checkOut(dto: CheckOutDto, profileId: string) {
    const tenantId = this.getTenantId();

    const now = dto.timestamp ? new Date(dto.timestamp) : new Date();
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);

    let attendance = await this.db.tx.staffAttendance.findUnique({
      where: { profileId_date: { profileId, date: dayStart } },
    });

    if (attendance) {
      attendance = await this.db.tx.staffAttendance.update({
        where: { id: attendance.id },
        data: { checkOut: now, status: AttendanceStatus.PRESENT },
      });
    } else {
      let branchId = dto.branchId;
      if (!branchId) {
        const teacher = await this.db.tx.teacher.findUnique({
          where: { profileId },
          select: { branchId: true },
        });
        branchId = teacher?.branchId;
      }
      if (!branchId) throw new BadRequestException('Could not determine branch');

      attendance = await this.db.tx.staffAttendance.create({
        data: {
          date: dayStart,
          status: AttendanceStatus.PRESENT,
          checkOut: now,
          profileId,
          branchId,
          tenantId,
        },
      });
    }

    return { data: attendance };
  }

  async findAll(query: {
    branchId?: string;
    profileId?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const tenantId = this.getTenantId();
    const where: any = { tenantId };

    if (query.branchId) where.branchId = query.branchId;
    if (query.profileId) where.profileId = query.profileId;

    const dateFilter: any = {};
    if (query.dateFrom) dateFilter.gte = new Date(query.dateFrom);
    if (query.dateTo) dateFilter.lte = new Date(query.dateTo);
    if (Object.keys(dateFilter).length > 0) where.date = dateFilter;

    const records = await this.databaseService.staffAttendance.findMany({
      where,
      include: { profile: { select: { name: true, type: true } } },
      orderBy: { date: 'desc' },
    });

    return { data: records };
  }

  async findOne(id: string) {
    const tenantId = this.getTenantId();
    const record = await this.databaseService.staffAttendance.findFirst({
      where: { id, tenantId },
      include: { profile: { select: { name: true, type: true } } },
    });
    if (!record) throw new NotFoundException('Attendance record not found');
    return { data: record };
  }

  @Transactional()
  async correct(
    id: string,
    dto: { newStatus: AttendanceStatus; reason: string; approvedBy?: string },
    correctedBy: string,
  ) {
    const tenantId = this.getTenantId();
    const original = await this.db.tx.staffAttendance.findFirst({
      where: { id, tenantId, originalRecordId: null },
    });
    if (!original) throw new NotFoundException('Original record not found');

    const daysSince = Math.floor(
      (Date.now() - original.createdAt.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysSince > 3 && !dto.approvedBy) {
      throw new BadRequestException(
        'Correction beyond 3 days requires Owner-level approval',
      );
    }

    const correction = await this.db.tx.staffAttendance.create({
      data: {
        date: original.date,
        status: dto.newStatus,
        checkIn: original.checkIn,
        checkOut: original.checkOut,
        profileId: original.profileId,
        branchId: original.branchId,
        originalRecordId: original.id,
        correctionReason: dto.reason,
        correctedBy,
        markedBy: original.markedBy,
        tenantId,
      },
    });

    return { data: correction };
  }

  async getPayrollSummary(
    branchId: string,
    periodStart: string,
    periodEnd: string,
  ) {
    const tenantId = this.getTenantId();

    const records = await this.databaseService.staffAttendance.findMany({
      where: {
        tenantId,
        branchId,
        date: {
          gte: new Date(periodStart),
          lte: new Date(periodEnd),
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const effectiveMap = new Map<string, (typeof records)[0]>();
    for (const r of records) {
      const key = `${r.profileId}_${r.date.toISOString().split('T')[0]}`;
      if (!effectiveMap.has(key)) {
        effectiveMap.set(key, r);
      }
    }

    const summary = new Map<
      string,
      { profileId: string; present: number; absent: number; late: number; excused: number }
    >();

    for (const r of effectiveMap.values()) {
      if (!summary.has(r.profileId)) {
        summary.set(r.profileId, {
          profileId: r.profileId,
          present: 0,
          absent: 0,
          late: 0,
          excused: 0,
        });
      }
      const entry = summary.get(r.profileId)!;
      switch (r.status) {
        case 'PRESENT': entry.present++; break;
        case 'ABSENT': entry.absent++; break;
        case 'LATE': entry.late++; break;
        case 'EXCUSED': entry.excused++; break;
      }
    }

    return { data: Array.from(summary.values()) };
  }

  private getTenantId(): string {
    return this.cls.get<string>(REQUEST_TENANT_ID)!;
  }
}
