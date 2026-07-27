import { Transactional, TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateTenantDto } from './dtos/create-tenant.dto';
import { UpdateTenantDto } from './dtos/update-tenant.dto';
import { HashingService } from '../auth/hashing.service';
import { ProfileType } from 'prisma/src/generated/prisma/enums';
import { SubscribeTenantDto } from './dtos/subscribe-tenant.dto';

@Injectable()
export class TenantService {
  private readonly logger = new Logger(TenantService.name);

  constructor(
    private readonly db: TransactionHost<
      TransactionalAdapterPrisma<DatabaseService>
    >,
    private readonly databaseService: DatabaseService,
    private readonly hashingService: HashingService,
  ) {}

  @Transactional()
  async create(dto: CreateTenantDto) {
    // Todo: change this check into a global exception filter or module specific exception filter
    const user = await this.findOwner(dto.ownerPhone);

    if (user) {
      throw new ConflictException(`School owner exists with this phone`);
    }

    await this.db.tx.user.create({
      data: {
        phoneNumber: dto.ownerPhone,
        password: await this.hashingService.hash(dto.password),
        profile: {
          create: {
            name: dto.ownerName,
            type: ProfileType.Owner,
            tenant: {
              create: {
                name: dto.name,
                description: dto.description,
                details: dto.details,
                branchCode: dto.branchCode,
              },
            },
          },
        },
      },
    });

    return { message: 'Registered School Successfully!' };
  }

  async findAll() {
    const tenants = await this.databaseService.tenant.findMany({
      include: {
        members: {
          where: {
            type: ProfileType.Owner,
          },
          include: {
            user: true,
          },
        },
        tenantSubscriptions: {
          orderBy: { endDate: 'desc' },
          take: 1,
          include: {
            subscription: true,
          },
        },
      },
    });

    const processedTenants = tenants.map((tenant) => {
      const { members, tenantSubscriptions, ...rest } = tenant;

      const owner = members[0];

      if (!owner) {
        throw new ConflictException(`School ${tenant.name} has no owner`);
      }

      const subscriptionEndDate =
        tenantSubscriptions[0]?.endDate.toISOString().split('T')[0] ?? null;

      return {
        ...rest,
        owner: owner
          ? {
              id: owner.id,
              name: owner.name,
              phoneNumber: owner.user.phoneNumber,
              userId: owner.user.id,
            }
          : null,
        subscriptionEndDate,
      };
    });

    return { data: processedTenants };
  }

  async findOne(id: string) {
    const tenant = await this.db.tx.tenant.findUnique({
      where: { id },
      include: {
        members: { include: { user: { omit: { password: true } } } },
        tenantSubscriptions: {
          orderBy: { endDate: 'desc' },
          include: { subscription: true },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException(`School not found`);
    }

    const { members, tenantSubscriptions, ...rest } = tenant;
    const subscriptionEndDate =
      tenantSubscriptions[0]?.endDate?.toISOString().split('T')[0] ?? null;

    const owner = members.find((member) => member.type === ProfileType.Owner);

    if (!owner) {
      throw new ConflictException(`Missing school owner`);
    }

    return {
      data: {
        ...rest,
        subscriptionEndDate,
        owner: {
          id: owner.id,
          name: owner.name,
          phoneNumber: owner.user.phoneNumber,
          userId: owner.user.id,
        },
        members: members
          .filter((member) => member.id !== owner.id)
          .map((member) => ({
            id: member.id,
            name: member.name,
            phoneNumber: member.user.phoneNumber,
            type: member.type,
            userId: member.user.id,
          })),
        tenantSubscriptions: tenantSubscriptions.map((ts) => ({
          ...ts,
          paidAmount: ts.paidAmount.toNumber(),
          subscription: {
            ...ts.subscription,
            price: ts.subscription.price.toNumber(),
          },
        })),
      },
    };
  }

  @Transactional()
  async update(id: string, dto: UpdateTenantDto) {
    const [existingTenant, user] = await Promise.all([
      this.findOne(id),
      this.findOwner(dto.ownerPhone),
    ]);

    if (dto.ownerPhone !== existingTenant.data.owner.phoneNumber && user) {
      throw new ConflictException(`School owner exists with this phone number`);
    }

    await this.db.tx.user.update({
      where: { id: existingTenant.data.owner.userId },
      data: {
        phoneNumber: dto.ownerPhone,
        profile: {
          update: {
            data: {
              name: dto.ownerName,
              type: ProfileType.Owner,
              tenant: {
                update: {
                  where: { id: existingTenant.data.id },
                  data: {
                    name: dto.name,
                    description: dto.description,
                    details: dto.details,
                    branchCode: dto.branchCode,
                  },
                },
              },
            },
          },
        },
      },
    });

    return { message: `Updated School Successfully!` };
  }

  @Transactional()
  async remove(id: string) {
    const tenant = await this.findOne(id);

    await this.db.tx.user.deleteMany({
      where: { profile: { tenantId: id } },
    });

    await this.db.tx.tenant.delete({
      where: { id },
    });

    return {
      message: `Removed School ${tenant.data.name} Successfully!`,
    };
  }

  // Tenant subscription handling instance methods
  async subscribeTenant(subscribeTenantDto: SubscribeTenantDto) {
    const subscriptionPlan = await this.db.tx.subscription.findUnique({
      where: {
        id: subscribeTenantDto.subscriptionId,
      },
      select: {
        active: true,
        months: true,
      },
    });

    if (!subscriptionPlan) {
      throw new NotFoundException(`Subscription not Found`);
    }

    if (!subscriptionPlan.active) {
      throw new ConflictException(`Subscription Plan not Active`);
    }

    const endDate = new Date(subscribeTenantDto.startDate);
    endDate.setMonth(endDate.getMonth() + subscriptionPlan.months);

    await this.db.tx.tenantSubscription.create({
      data: {
        tenantId: subscribeTenantDto.tenantId,
        subscriptionId: subscribeTenantDto.subscriptionId,
        startDate: subscribeTenantDto.startDate,
        paidAmount: subscribeTenantDto.paidAmount,
        endDate,
      },
    });

    return {
      message: `Subscribed Tenant Successfully!`,
    };
  }

  async removeTenantSubscription(id: string) {
    const tenantSubsription = await this.db.tx.tenantSubscription.findUnique({
      where: { id },
    });

    if (!tenantSubsription) {
      throw new NotFoundException(`Tenant Subscription not Found`);
    }

    await this.db.tx.tenantSubscription.delete({
      where: { id },
    });

    return {
      message: 'Tenant Subscription removed Successfully!',
    };
  }

  // Helper instance methods
  async findOwner(phoneNumber: string) {
    const owner = await this.db.tx.user.findUnique({
      where: {
        phoneNumber,
      },
      include: {
        profile: true,
      },
    });

    return owner;
  }
}
