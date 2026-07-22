import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { AssignOwnerDto } from './dtos/assign-owner.dto';
import { CreateTenantDto } from './dtos/create-tenant.dto';
import { UpdateTenantDto } from './dtos/update-tenant.dto';

@Injectable()
export class TenantService {
  constructor(
    private readonly db: TransactionHost<
      TransactionalAdapterPrisma<DatabaseService>
    >,
  ) {}

  async create(dto: CreateTenantDto) {
    const tenant = await this.db.tx.tenant.create({
      data: {
        name: dto.name,
        description: dto.description,
        ...(dto.details !== undefined && { details: dto.details as any }),
      },
    });

    return { data: tenant };
  }

  async assignOwner(tenantId: string, dto: AssignOwnerDto) {
    const tenant = await this.db.tx.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with id ${tenantId} not found`);
    }

    const owner = await this.db.tx.user.findUnique({
      where: { phoneNumber: dto.ownerPhoneNumber },
      include: { profile: true },
    });

    if (!owner) {
      throw new NotFoundException(
        `User with phone ${dto.ownerPhoneNumber} not found`,
      );
    }

    if (owner.profile) {
      throw new ConflictException(
        `User ${dto.ownerPhoneNumber} already belongs to a tenant`,
      );
    }

    const profile = await this.db.tx.profile.create({
      data: {
        name: owner.phoneNumber,
        type: 'Owner',
        userId: owner.id,
        tenantId: tenant.id,
      },
    });

    return { data: profile };
  }

  async findAll() {
    const tenants = await this.db.tx.tenant.findMany({
      include: { members: true },
    });

    return { data: tenants };
  }

  async findOne(id: string) {
    const tenant = await this.db.tx.tenant.findUnique({
      where: { id },
      include: { members: true },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with id ${id} not found`);
    }

    return { data: tenant };
  }

  async update(id: string, dto: UpdateTenantDto) {
    await this.findOne(id);

    const tenant = await this.db.tx.tenant.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.details !== undefined && { details: dto.details as any }),
      },
    });

    return { data: tenant };
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.db.tx.profile.deleteMany({
      where: { tenantId: id },
    });

    await this.db.tx.tenant.delete({
      where: { id },
    });
  }
}
