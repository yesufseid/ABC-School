import { Transactional, TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { HashingService } from '../../auth/hashing.service';
import { ProfileType } from 'prisma/src/generated/prisma/enums';
import { CreateStaffDto } from './dtos/create-staff.dto';
import { UpdateStaffDto } from './dtos/update-staff.dto';
import { TokenPayload } from 'src/modules/auth/auth.types';
import {
  generatePassword,
  generateStaffId,
} from 'src/common/helpers/generator.helper';
import { Prisma } from 'prisma/src/generated/prisma/client';

@Injectable()
export class StaffService {
  private readonly logger = new Logger(StaffService.name);

  constructor(
    private readonly db: TransactionHost<
      TransactionalAdapterPrisma<DatabaseService>
    >,
    private readonly databaseService: DatabaseService,
    private readonly hashingService: HashingService,
  ) {}

  @Transactional()
  async create(dto: CreateStaffDto, user: TokenPayload) {
    const tenantId = this.resolveTenantId(user);

    const tenant = await this.db.tx.tenant.findUnique({
      where: { id: tenantId },
      select: { branchCode: true },
    });

    if (!tenant?.branchCode) {
      throw new ConflictException(
        'Tenant branch code is not configured. Set a branch code first.',
      );
    }

    const existingUser = await this.db.tx.user.findUnique({
      where: { phoneNumber: dto.phoneNumber },
    });

    if (existingUser) {
      throw new ConflictException(
        'Staff with this phone number already exists',
      );
    }

    const count = await this.db.tx.staff.count({
      where: { tenantId },
    });

    const staffId = generateStaffId(tenant.branchCode, new Date().getFullYear(), count + 1);
    const rawPassword = generatePassword();
    const hashedPassword = await this.hashingService.hash(rawPassword);

    const fullName = dto.middleName
      ? `${dto.firstName} ${dto.middleName} ${dto.lastName}`
      : `${dto.firstName} ${dto.lastName}`;

    const profile = await this.db.tx.profile.create({
      data: {
        name: fullName,
        type: ProfileType.Staff,
        tenantId,
        user: {
          create: {
            phoneNumber: dto.phoneNumber,
            password: hashedPassword,
          },
        },
        staff: {
          create: {
            staffId,
            firstName: dto.firstName,
            middleName: dto.middleName,
            lastName: dto.lastName,
            email: dto.email,
            address: dto.address,
            sex: dto.sex,
            startingDate: new Date(dto.startingDate),
            position: dto.position,
            department: dto.department,
            tenantId,
          },
        },
      },
      include: {
        user: true,
        staff: { include: { profile: { include: { user: true } } } },
      },
    });

    this.logger.log(
      `Staff [${staffId}] phone: ${dto.phoneNumber} temporary password: ${rawPassword}`,
    );

    return { data: this.formatStaffResponse(profile.staff!) };
  }

  async findAll(user: TokenPayload) {
    const where: Prisma.StaffWhereInput = {};

    if (user.type !== ProfileType.Admin) {
      where.tenantId = user.tenantId!;
    }

    const staffs = await this.databaseService.staff.findMany({
      where,
      include: {
        profile: { include: { user: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { data: staffs.map((s) => this.formatStaffResponse(s)) };
  }

  async findOne(id: string, user: TokenPayload) {
    const staff = await this.databaseService.staff.findUnique({
      where: { id },
      include: {
        profile: { include: { user: true } },
      },
    });

    if (!staff || !staff.profile) {
      throw new NotFoundException('Staff not found');
    }

    if (
      user.type !== ProfileType.Admin &&
      staff.tenantId !== user.tenantId
    ) {
      throw new ForbiddenException('Access denied');
    }

    return { data: this.formatStaffResponse(staff) };
  }

  @Transactional()
  async update(id: string, dto: UpdateStaffDto, user: TokenPayload) {
    const staff = await this.databaseService.staff.findUnique({
      where: { id },
    });

    if (!staff) {
      throw new NotFoundException('Staff not found');
    }

    if (
      user.type !== ProfileType.Admin &&
      staff.tenantId !== user.tenantId
    ) {
      throw new ForbiddenException('Access denied');
    }

    const updateData = this.buildStaffUpdate(dto);

    if (Object.keys(updateData).length > 0) {
      await this.db.tx.staff.update({
        where: { id },
        data: updateData,
      });
    }

    return this.findOne(id, user);
  }

  @Transactional()
  async remove(id: string, user: TokenPayload) {
    const staff = await this.databaseService.staff.findUnique({
      where: { id },
      include: { profile: { include: { user: true } } },
    });

    if (!staff || !staff.profile) {
      throw new NotFoundException('Staff not found');
    }

    if (
      user.type !== ProfileType.Admin &&
      staff.tenantId !== user.tenantId
    ) {
      throw new ForbiddenException('Access denied');
    }

    await this.db.tx.user.delete({
      where: { id: staff.profile.user!.id },
    });

    return { message: 'Staff removed successfully' };
  }

  private resolveTenantId(user: TokenPayload): string {
    if (!user.tenantId) {
      throw new ForbiddenException('Access denied');
    }

    return user.tenantId;
  }

  private buildStaffUpdate(dto: UpdateStaffDto) {
    const data: Record<string, unknown> = {};
    if (dto.firstName !== undefined) data.firstName = dto.firstName;
    if (dto.middleName !== undefined) data.middleName = dto.middleName;
    if (dto.lastName !== undefined) data.lastName = dto.lastName;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.address !== undefined) data.address = dto.address;
    if (dto.sex !== undefined) data.sex = dto.sex;
    if (dto.startingDate !== undefined)
      data.startingDate = new Date(dto.startingDate);
    if (dto.position !== undefined) data.position = dto.position;
    if (dto.department !== undefined) data.department = dto.department;
    return data;
  }

  private formatStaffResponse(
    staff: Prisma.StaffGetPayload<{
      include: { profile: { include: { user: true } } };
    }>,
  ) {
    return {
      id: staff.id,
      staffId: staff.staffId,
      firstName: staff.firstName,
      middleName: staff.middleName,
      lastName: staff.lastName,
      email: staff.email,
      address: staff.address,
      sex: staff.sex,
      startingDate: staff.startingDate,
      position: staff.position,
      department: staff.department,
      verifiedAt: staff.verifiedAt,
      tenantId: staff.tenantId,
      phoneNumber: staff.profile?.user?.phoneNumber,
      userId: staff.profile?.user?.id,
      name: staff.profile?.name,
      type: staff.profile?.type,
      createdAt: staff.createdAt,
    };
  }
}
