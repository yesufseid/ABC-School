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
import { CreateEventDto } from './dtos/create-event.dto';
import { UpdateEventDto } from './dtos/update-event.dto';

@Injectable()
export class CalendarService {
  constructor(
    private readonly cls: ClsService,
    private readonly db: TransactionHost<
      TransactionalAdapterPrisma<DatabaseService>
    >,
    private readonly databaseService: DatabaseService,
  ) {}

  @Transactional()
  async create(dto: CreateEventDto) {
    const tenantId = this.getTenantId();

    if (new Date(dto.endDate) < new Date(dto.startDate)) {
      throw new BadRequestException('endDate must be after startDate');
    }

    if (!dto.branchIds || dto.branchIds.length === 0) {
      throw new BadRequestException('At least one branch must be selected');
    }

    const branchCount = await this.databaseService.branch.count({
      where: { id: { in: dto.branchIds }, tenantId },
    });
    if (branchCount !== dto.branchIds.length) {
      throw new BadRequestException('One or more branches not found');
    }

    const event = await this.db.tx.calendarEvent.create({
      data: {
        title: dto.title,
        category: dto.category,
        description: dto.description,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        tenantId,
        branches: {
          create: dto.branchIds.map((branchId) => ({ branchId })),
        },
      },
      include: { branches: true },
    });

    return { data: event };
  }

  async findAll(query: {
    startDate?: string;
    endDate?: string;
    category?: string;
    branchId?: string;
  }) {
    const tenantId = this.getTenantId();

    const where: any = { tenantId };

    if (query.startDate) {
      where.startDate = { gte: new Date(query.startDate) };
    }
    if (query.endDate) {
      where.endDate = { lte: new Date(query.endDate) };
    }
    if (query.category) {
      where.category = query.category;
    }
    if (query.branchId) {
      where.branches = { some: { branchId: query.branchId } };
    }

    const events = await this.databaseService.calendarEvent.findMany({
      where,
      include: { branches: { include: { branch: true } } },
      orderBy: { startDate: 'asc' },
    });

    return { data: events };
  }

  async findOne(id: string) {
    const tenantId = this.getTenantId();
    const event = await this.databaseService.calendarEvent.findFirst({
      where: { id, tenantId },
      include: { branches: { include: { branch: true } } },
    });
    if (!event) throw new NotFoundException('Event not found');
    return { data: event };
  }

  @Transactional()
  async update(id: string, dto: UpdateEventDto) {
    const tenantId = this.getTenantId();
    const event = await this.db.tx.calendarEvent.findFirst({
      where: { id, tenantId },
    });
    if (!event) throw new NotFoundException('Event not found');

    if (dto.startDate && dto.endDate) {
      if (new Date(dto.endDate) < new Date(dto.startDate)) {
        throw new BadRequestException('endDate must be after startDate');
      }
    } else if (dto.startDate && !dto.endDate) {
      if (new Date(event.endDate) < new Date(dto.startDate)) {
        throw new BadRequestException('endDate must be after startDate');
      }
    } else if (!dto.startDate && dto.endDate) {
      if (new Date(dto.endDate) < new Date(event.startDate)) {
        throw new BadRequestException('endDate must be after startDate');
      }
    }

    if (dto.branchIds) {
      if (dto.branchIds.length === 0) {
        throw new BadRequestException('At least one branch must be selected');
      }

      const branchCount = await this.db.tx.branch.count({
        where: { id: { in: dto.branchIds }, tenantId },
      });
      if (branchCount !== dto.branchIds.length) {
        throw new BadRequestException('One or more branches not found');
      }

      await this.db.tx.eventBranch.deleteMany({ where: { eventId: id } });
      await this.db.tx.eventBranch.createMany({
        data: dto.branchIds.map((branchId) => ({ eventId: id, branchId })),
      });
    }

    const { branchIds, ...scalars } = dto as any;
    if (Object.keys(scalars).length > 0) {
      const updateData: any = { ...scalars };
      if (scalars.startDate) updateData.startDate = new Date(scalars.startDate);
      if (scalars.endDate) updateData.endDate = new Date(scalars.endDate);
      await this.db.tx.calendarEvent.update({
        where: { id },
        data: updateData,
      });
    }

    return this.findOne(id);
  }

  @Transactional()
  async remove(id: string) {
    const tenantId = this.getTenantId();
    const event = await this.db.tx.calendarEvent.findFirst({
      where: { id, tenantId },
    });
    if (!event) throw new NotFoundException('Event not found');

    await this.db.tx.calendarEvent.delete({ where: { id } });
    return { message: 'Event deleted successfully' };
  }

  async getUpcoming() {
    const tenantId = this.getTenantId();
    const now = new Date();
    const events = await this.databaseService.calendarEvent.findMany({
      where: { tenantId, endDate: { gte: now } },
      include: { branches: { include: { branch: true } } },
      orderBy: { startDate: 'asc' },
      take: 20,
    });
    return { data: events };
  }

  async getByCategory() {
    const tenantId = this.getTenantId();
    const events = await this.databaseService.calendarEvent.findMany({
      where: { tenantId },
      include: { branches: { include: { branch: true } } },
      orderBy: { startDate: 'asc' },
    });

    const grouped = events.reduce(
      (acc, event) => {
        const cat = event.category;
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(event);
        return acc;
      },
      {} as Record<string, any[]>,
    );

    return { data: grouped };
  }

  private getTenantId(): string {
    return this.cls.get<string>(REQUEST_TENANT_ID)!;
  }
}
