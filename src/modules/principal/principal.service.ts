import { ClsService } from 'nestjs-cls';
import { Transactional, TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { HashingService } from '../auth/hashing.service';
import { REQUEST_TENANT_ID } from '../auth/auth.constants';
import { ProfileType } from 'prisma/src/generated/prisma/enums';
import { CreatePrincipalDto } from './dtos/create-principal.dto';
import { UpdatePrincipalDto } from './dtos/update-principal.dto';
import {
  generatePassword,
  generatePrincipalId,
} from 'src/common/helpers/generator.helper';

@Injectable()
export class PrincipalService {
  private readonly logger = new Logger(PrincipalService.name);

  constructor(
    private readonly cls: ClsService,
    private readonly db: TransactionHost<
      TransactionalAdapterPrisma<DatabaseService>
    >,
    private readonly databaseService: DatabaseService,
    private readonly hashingService: HashingService,
  ) {}

  @Transactional()
  async create(dto: CreatePrincipalDto) {
    const tenantId = this.getTenantId();

    const branch = await this.db.tx.branch.findUnique({
      where: { id: dto.branchId },
      select: { branchPrefix: true, tenantId: true },
    });
    if (!branch) throw new NotFoundException('Branch not found');
    if (branch.tenantId !== tenantId) {
      throw new ConflictException('Branch does not belong to this tenant');
    }

    const existingUser = await this.db.tx.user.findUnique({
      where: { phoneNumber: dto.phone },
    });
    if (existingUser) {
      throw new ConflictException(
        'A user with this phone number already exists',
      );
    }

    const count = await this.db.tx.principal.count({ where: { tenantId } });
    const principalId = generatePrincipalId(branch.branchPrefix, count + 1);
    const rawPassword = generatePassword();
    const hashedPassword = await this.hashingService.hash(rawPassword);

    const fullName = dto.middleName
      ? `${dto.firstName} ${dto.middleName} ${dto.lastName}`
      : `${dto.firstName} ${dto.lastName}`;

    const profileType = dto.isVicePrincipal
      ? ProfileType.VicePrincipal
      : ProfileType.Principal;

    const profile = await this.db.tx.profile.create({
      data: {
        name: fullName,
        type: profileType,
        tenantId,
        userId: (
          await this.db.tx.user.create({
            data: {
              phoneNumber: dto.phone,
              password: hashedPassword,
            },
          })
        ).id,
      },
    });

    await this.db.tx.principal.create({
      data: {
        principalId,
        firstName: dto.firstName,
        middleName: dto.middleName,
        lastName: dto.lastName,
        phone: dto.phone,
        email: dto.email,
        address: dto.address,
        sex: dto.sex,
        startingDate: new Date(dto.startingDate),
        profileId: profile.id,
        tenantId,
        branchId: dto.branchId,
      },
    });

    this.logger.log(`Principal [${principalId}] admitted`);

    return {
      message: 'Principal admitted successfully',
      data: { principalId, temporaryPassword: rawPassword, role: profileType },
    };
  }

  async findAll() {
    const principals = await this.databaseService
      .getExtendedClient()
      .principal.findMany({
        include: {
          profile: { include: { user: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

    return { data: principals.map((p) => this.formatResponse(p)) };
  }

  async findOne(id: string) {
    const principal = await this.databaseService
      .getExtendedClient()
      .principal.findFirst({
        where: { id },
        include: {
          profile: { include: { user: true } },
        },
      });

    if (!principal || !principal.profile) {
      throw new NotFoundException('Principal not found');
    }

    return { data: this.formatResponse(principal) };
  }

  @Transactional()
  async update(id: string, dto: UpdatePrincipalDto) {
    const tenantId = this.getTenantId();
    const principal = await this.db.tx.principal.findFirst({
      where: { id, tenantId },
    });
    if (!principal) throw new NotFoundException('Principal not found');

    const { ...scalars } = dto as any;
    if (Object.keys(scalars).length > 0) {
      if (scalars.startingDate)
        scalars.startingDate = new Date(scalars.startingDate);
      await this.db.tx.principal.update({
        where: { id },
        data: scalars,
      });
    }

    return this.findOne(id);
  }

  @Transactional()
  async remove(id: string) {
    const tenantId = this.getTenantId();
    const principal = await this.db.tx.principal.findFirst({
      where: { id, tenantId },
      include: { profile: { include: { user: true } } },
    });
    if (!principal || !principal.profile) {
      throw new NotFoundException('Principal not found');
    }

    await this.db.tx.user.delete({
      where: { id: principal.profile.user.id },
    });

    return { message: 'Principal removed successfully' };
  }

  private getTenantId(): string {
    return this.cls.get<string>(REQUEST_TENANT_ID)!;
  }

  private formatResponse(principal: any) {
    return {
      id: principal.id,
      principalId: principal.principalId,
      firstName: principal.firstName,
      middleName: principal.middleName,
      lastName: principal.lastName,
      phone: principal.phone,
      email: principal.email,
      address: principal.address,
      sex: principal.sex,
      startingDate: principal.startingDate,
      photoUrl: principal.photoUrl,
      documentKeys: principal.documentKeys,
      branchId: principal.branchId,
      tenantId: principal.tenantId,
      phoneNumber: principal.profile?.user?.phoneNumber,
      userId: principal.profile?.user?.id,
      name: principal.profile?.name,
      type: principal.profile?.type,
      createdAt: principal.createdAt,
    };
  }
}
