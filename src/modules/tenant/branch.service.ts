import { Transactional, TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateBranchDto } from './dtos/create-branch.dto';
import { UpdateBranchDto } from './dtos/update-branch.dto';

@Injectable()
export class BranchService {
  private readonly logger = new Logger(BranchService.name);

  constructor(
    private readonly db: TransactionHost<
      TransactionalAdapterPrisma<DatabaseService>
    >,
    private readonly databaseService: DatabaseService,
  ) {}

  private async ensureTenantExists(tenantId: string): Promise<void> {
    const tenant = await this.databaseService.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant not found`);
    }
  }

  @Transactional()
  async create(tenantId: string, dto: CreateBranchDto) {
    await this.ensureTenantExists(tenantId);

    const [existingPrefix, existingCode] = await Promise.all([
      this.db.tx.branch.findFirst({
        where: { branchPrefix: dto.branchPrefix },
        select: { id: true },
      }),
      this.db.tx.branch.findFirst({
        where: { tenantId, branchCode: dto.branchCode },
        select: { id: true },
      }),
    ]);

    if (existingPrefix) {
      throw new ConflictException(
        `Branch prefix "${dto.branchPrefix}" already exists`,
      );
    }

    if (existingCode) {
      throw new ConflictException(
        `Branch code "${dto.branchCode}" already exists for this tenant`,
      );
    }

    return this.db.tx.branch.create({
      data: {
        name: dto.name,
        description: dto.description,
        branchCode: dto.branchCode,
        branchPrefix: dto.branchPrefix,
        details: dto.details,
        tenantId,
      },
    });
  }

  async findAll(tenantId: string) {
    await this.ensureTenantExists(tenantId);

    const branches = await this.databaseService.branch.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });

    return { data: branches };
  }

  async findOne(tenantId: string, id: string) {
    await this.ensureTenantExists(tenantId);

    const branch = await this.db.tx.branch.findFirst({
      where: { id, tenantId },
    });

    if (!branch) {
      throw new NotFoundException(`Branch not found`);
    }

    return { data: branch };
  }

  @Transactional()
  async update(tenantId: string, id: string, dto: UpdateBranchDto) {
    await this.ensureTenantExists(tenantId);

    const branch = await this.findOne(tenantId, id);

    if (dto.branchPrefix && dto.branchPrefix !== branch.data.branchPrefix) {
      const existingPrefix = await this.db.tx.branch.findFirst({
        where: { branchPrefix: dto.branchPrefix, NOT: { id } },
        select: { id: true },
      });

      if (existingPrefix) {
        throw new ConflictException(
          `Branch prefix "${dto.branchPrefix}" already exists`,
        );
      }
    }

    if (dto.branchCode && dto.branchCode !== branch.data.branchCode) {
      const existingCode = await this.db.tx.branch.findFirst({
        where: { tenantId, branchCode: dto.branchCode, NOT: { id } },
        select: { id: true },
      });

      if (existingCode) {
        throw new ConflictException(
          `Branch code "${dto.branchCode}" already exists for this tenant`,
        );
      }
    }

    return this.db.tx.branch.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.branchCode !== undefined && { branchCode: dto.branchCode }),
        ...(dto.branchPrefix !== undefined && {
          branchPrefix: dto.branchPrefix,
        }),
        ...(dto.details !== undefined && { details: dto.details }),
      },
    });
  }

  @Transactional()
  async remove(tenantId: string, id: string) {
    await this.ensureTenantExists(tenantId);

    const branch = await this.findOne(tenantId, id);

    const studentCount = await this.db.tx.studentGrade.count({
      where: { branchId: id },
    });

    if (studentCount > 0) {
      throw new ConflictException(
        `Cannot delete branch "${branch.data.name}" with existing student grade records`,
      );
    }

    await this.db.tx.branch.delete({ where: { id } });

    return { message: `Branch "${branch.data.name}" deleted successfully` };
  }
}
