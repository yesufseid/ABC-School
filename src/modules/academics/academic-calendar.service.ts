import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { Transactional, TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { DatabaseService } from '../database/database.service';
import { REQUEST_TENANT_ID } from '../auth/auth.constants';
import {
  AcademicCalendarType,
  AcademicPeriodType,
} from 'prisma/src/generated/prisma/enums';
import {
  CreateAcademicYearDto,
  UpdateAcademicYearDto,
  CreatePeriodDto,
  UpdatePeriodDto,
} from './dtos/academic-calendar.dto';

@Injectable()
export class AcademicCalendarService {
  constructor(
    private readonly cls: ClsService,
    private readonly db: TransactionHost<
      TransactionalAdapterPrisma<DatabaseService>
    >,
    private readonly databaseService: DatabaseService,
  ) {}

  // ── Academic Years ──

  @Transactional()
  async createYear(dto: CreateAcademicYearDto) {
    const tenantId = this.getTenantId();
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    if (startDate >= endDate) {
      throw new BadRequestException('startDate must be before endDate');
    }

    const existing = await this.db.tx.academicYear.findFirst({
      where: { tenantId, name: dto.name },
    });
    if (existing) {
      throw new BadRequestException(
        `Academic year "${dto.name}" already exists`,
      );
    }

    const year = await this.db.tx.academicYear.create({
      data: {
        name: dto.name,
        calendarType: dto.calendarType,
        startDate,
        endDate,
        status: dto.status ?? 'ACTIVE',
        isCurrent: dto.isCurrent ?? false,
        tenantId,
      },
    });

    if (year.isCurrent) {
      await this.db.tx.academicYear.updateMany({
        where: { tenantId, id: { not: year.id } },
        data: { isCurrent: false },
      });
    }

    await this.generatePeriods(year.id, dto.calendarType, startDate, endDate);

    return this.findOneYearTx(year.id);
  }

  async findAllYears() {
    const tenantId = this.getTenantId();
    const years = await this.databaseService.academicYear.findMany({
      where: { tenantId },
      include: { periods: { orderBy: { sequence: 'asc' } } },
      orderBy: { startDate: 'desc' },
    });
    return { data: years };
  }

  async findOneYear(id: string) {
    const tenantId = this.getTenantId();
    const year = await this.databaseService.academicYear.findFirst({
      where: { id, tenantId },
      include: { periods: { orderBy: { sequence: 'asc' } } },
    });
    if (!year) throw new NotFoundException('Academic year not found');
    return { data: year };
  }

  async getCurrentYear() {
    const tenantId = this.getTenantId();
    const year = await this.databaseService.academicYear.findFirst({
      where: { tenantId, isCurrent: true },
      include: { periods: { orderBy: { sequence: 'asc' } } },
    });
    return { data: year ?? null };
  }

  @Transactional()
  async updateYear(id: string, dto: UpdateAcademicYearDto) {
    const tenantId = this.getTenantId();
    const existing = await this.db.tx.academicYear.findFirst({
      where: { id, tenantId },
    });
    if (!existing) throw new NotFoundException('Academic year not found');

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.calendarType !== undefined) data.calendarType = dto.calendarType;
    if (dto.startDate !== undefined) data.startDate = new Date(dto.startDate);
    if (dto.endDate !== undefined) data.endDate = new Date(dto.endDate);
    if (dto.status !== undefined) data.status = dto.status;

    if (data.startDate && data.endDate && data.startDate >= data.endDate) {
      throw new BadRequestException('startDate must be before endDate');
    }

    if (dto.isCurrent !== undefined) {
      data.isCurrent = dto.isCurrent;
      if (dto.isCurrent) {
        await this.db.tx.academicYear.updateMany({
          where: { tenantId, id: { not: id } },
          data: { isCurrent: false },
        });
      }
    }

    await this.db.tx.academicYear.update({ where: { id }, data });
    return this.findOneYearTx(id);
  }

  @Transactional()
  async setCurrentYear(id: string) {
    const tenantId = this.getTenantId();
    const existing = await this.db.tx.academicYear.findFirst({
      where: { id, tenantId },
    });
    if (!existing) throw new NotFoundException('Academic year not found');

    await this.db.tx.academicYear.updateMany({
      where: { tenantId },
      data: { isCurrent: false },
    });
    await this.db.tx.academicYear.update({
      where: { id },
      data: { isCurrent: true },
    });

    return this.findOneYearTx(id);
  }

  @Transactional()
  async removeYear(id: string) {
    const tenantId = this.getTenantId();
    const existing = await this.db.tx.academicYear.findFirst({
      where: { id, tenantId },
      include: { periods: true },
    });
    if (!existing) throw new NotFoundException('Academic year not found');

    const periodIds = existing.periods.map((p) => p.id);
    const results = await this.db.tx.academicResult.count({
      where: { periodId: { in: periodIds } },
    });
    if (results > 0) {
      throw new BadRequestException(
        'Cannot delete academic year: results are linked to its periods',
      );
    }

    await this.db.tx.academicYear.delete({ where: { id } });
    return { message: 'Academic year deleted' };
  }

  // ── Periods ──

  @Transactional()
  async createPeriod(yearId: string, dto: CreatePeriodDto) {
    const tenantId = this.getTenantId();
    const year = await this.db.tx.academicYear.findFirst({
      where: { id: yearId, tenantId },
    });
    if (!year) throw new NotFoundException('Academic year not found');

    const existing = await this.db.tx.academicPeriod.findUnique({
      where: {
        academicYearId_sequence: {
          academicYearId: yearId,
          sequence: dto.sequence,
        },
      },
    });
    if (existing) {
      throw new BadRequestException(
        `Period ${dto.sequence} already exists for this year`,
      );
    }

    const period = await this.db.tx.academicPeriod.create({
      data: {
        name: dto.name,
        sequence: dto.sequence,
        type: dto.type,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        academicYearId: yearId,
        tenantId,
      },
    });
    return { data: period };
  }

  @Transactional()
  async updatePeriod(id: string, dto: UpdatePeriodDto) {
    const tenantId = this.getTenantId();
    const existing = await this.db.tx.academicPeriod.findFirst({
      where: { id, tenantId },
    });
    if (!existing) throw new NotFoundException('Period not found');

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.sequence !== undefined) data.sequence = dto.sequence;
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.startDate !== undefined) data.startDate = new Date(dto.startDate);
    if (dto.endDate !== undefined) data.endDate = new Date(dto.endDate);

    if (data.startDate && data.endDate && data.startDate >= data.endDate) {
      throw new BadRequestException('startDate must be before endDate');
    }

    const updated = await this.db.tx.academicPeriod.update({
      where: { id },
      data,
    });
    return { data: updated };
  }

  @Transactional()
  async removePeriod(id: string) {
    const tenantId = this.getTenantId();
    const existing = await this.db.tx.academicPeriod.findFirst({
      where: { id, tenantId },
    });
    if (!existing) throw new NotFoundException('Period not found');

    const results = await this.db.tx.academicResult.count({
      where: { periodId: id },
    });
    if (results > 0) {
      throw new BadRequestException(
        'Cannot delete period: results are linked to it',
      );
    }

    await this.db.tx.academicPeriod.delete({ where: { id } });
    return { message: 'Period deleted' };
  }

  // ── Helpers ──

  private async generatePeriods(
    yearId: string,
    calendarType: AcademicCalendarType,
    startDate: Date,
    endDate: Date,
  ) {
    const tenantId = this.getTenantId();
    const count = calendarType === AcademicCalendarType.SEMESTER ? 2 : 4;
    const type =
      calendarType === AcademicCalendarType.SEMESTER
        ? AcademicPeriodType.SEMESTER
        : AcademicPeriodType.TERM;
    const label =
      calendarType === AcademicCalendarType.SEMESTER ? 'Semester' : 'Term';
    const total = endDate.getTime() - startDate.getTime();

    for (let i = 0; i < count; i++) {
      const from = new Date(startDate.getTime() + (total * i) / count);
      const to = new Date(startDate.getTime() + (total * (i + 1)) / count);
      await this.db.tx.academicPeriod.create({
        data: {
          name: `${label} ${i + 1}`,
          sequence: i + 1,
          type,
          startDate: from,
          endDate: to,
          academicYearId: yearId,
          tenantId,
        },
      });
    }
  }

  private async findOneYearTx(id: string) {
    const year = await this.db.tx.academicYear.findFirst({
      where: { id },
      include: { periods: { orderBy: { sequence: 'asc' } } },
    });
    return { data: year };
  }

  private getTenantId(): string {
    return this.cls.get<string>(REQUEST_TENANT_ID)!;
  }
}
