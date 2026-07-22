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
      },
    });

    const processedTenants = tenants.map((tenant) => {
      const { members, ...rest } = tenant;

      return {
        ...rest,
        owner: members[0],
      };
    });

    return { data: processedTenants };
  }

  async findOne(id: string) {
    const tenant = await this.db.tx.tenant.findUnique({
      where: { id },
      include: { members: { include: { user: true } } },
    });

    if (!tenant) {
      throw new NotFoundException(`School not found`);
    }

    const owner = tenant.members.find(
      (member) => member.type === ProfileType.Owner,
    );

    if (!owner) {
      throw new ConflictException(`Missing school owner`);
    }

    return {
      data: {
        ...tenant,
        owner,
      },
    };
  }

  @Transactional()
  async update(id: string, dto: UpdateTenantDto) {
    const [existingTenant, user] = await Promise.all([
      this.findOne(id),
      this.findOwner(dto.ownerPhone),
    ]);

    if (dto.ownerPhone !== existingTenant.data.owner.user.phoneNumber && user) {
      throw new ConflictException(`School owner exists with this phone number`);
    }

    await this.db.tx.user.update({
      where: { id: existingTenant.data.owner.userId },
      data: {
        phoneNumber: dto.ownerPhone,
        profile: {
          update: {
            where: {
              id: existingTenant.data.owner.id,
            },
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
}
