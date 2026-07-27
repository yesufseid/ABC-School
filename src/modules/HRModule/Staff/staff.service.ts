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
import { ProfileType, Sex } from 'prisma/src/generated/prisma/enums';
import { CreateStaffDto } from './dtos/create-staff.dto';
import { UpdateStaffDto } from './dtos/update-staff.dto';
import { TokenPayload } from 'src/modules/auth/auth.types';

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
    const tenantId = this.resolveTenantId(dto.tenantId, user);

    const existingUser = await this.db.tx.user.findUnique({
      where: { phoneNumber: dto.phoneNumber },
    });

    if (existingUser) {
      throw new ConflictException('Staff with this phone number already exists');
    }

    const hashedPassword = await this.hashingService.hash(dto.password);

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
        staff: true,
      },
    });

    return { data: this.formatStaffResponse(profile) };
  }

  async findAll(user: TokenPayload) {
    const where: any = { type: ProfileType.Staff };

    if (user.type !== ProfileType.Admin) {
      where.tenantId = user.tenantId;
    }

    const profiles = await this.databaseService.profile.findMany({
      where,
      include: {
        user: { omit: { password: true } },
        staff: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return { data: profiles.map((p) => this.formatStaffResponse(p)) };
  }

  async findOne(id: string, user: TokenPayload) {
    const profile = await this.databaseService.profile.findUnique({
      where: { id },
      include: {
        user: { omit: { password: true } },
        staff: true,
      },
    });

    if (!profile || profile.type !== ProfileType.Staff || !profile.staff) {
      throw new NotFoundException('Staff not found');
    }

    if (
      user.type !== ProfileType.Admin &&
      profile.tenantId !== user.tenantId
    ) {
      throw new ForbiddenException('Access denied');
    }

    return { data: this.formatStaffResponse(profile) };
  }

  @Transactional()
  async update(id: string, dto: UpdateStaffDto, user: TokenPayload) {
    const existing = await this.findOne(id, user);
    const staffData: any = {};
    const profileData: any = {};

    if (dto.firstName || dto.middleName || dto.lastName) {
      const firstName = dto.firstName ?? existing.data.firstName;
      const middleName =
        dto.middleName !== undefined
          ? dto.middleName
          : existing.data.middleName;
      const lastName = dto.lastName ?? existing.data.lastName;
      profileData.name = middleName
        ? `${firstName} ${middleName} ${lastName}`
        : `${firstName} ${lastName}`;
    }

    if (dto.firstName) staffData.firstName = dto.firstName;
    if (dto.middleName !== undefined) staffData.middleName = dto.middleName;
    if (dto.lastName) staffData.lastName = dto.lastName;
    if (dto.email !== undefined) staffData.email = dto.email;
    if (dto.address !== undefined) staffData.address = dto.address;
    if (dto.sex !== undefined) staffData.sex = dto.sex;
    if (dto.startingDate) staffData.startingDate = new Date(dto.startingDate);
    if (dto.position) staffData.position = dto.position;
    if (dto.department !== undefined) staffData.department = dto.department;

    const userData: any = {};
    if (dto.phoneNumber) userData.phoneNumber = dto.phoneNumber;

    if (dto.password) {
      const existingUser = await this.db.tx.user.findUnique({
        where: { id: existing.data.userId },
        select: { id: true },
      });

      if (!existingUser) {
        throw new NotFoundException('User not found');
      }

      userData.password = await this.hashingService.hash(dto.password);
    }

    if (Object.keys(userData).length > 0) {
      await this.db.tx.user.update({
        where: { id: existing.data.userId },
        data: userData,
      });
    }

    if (Object.keys(staffData).length > 0) {
      await this.db.tx.staff.update({
        where: { id: existing.data.staffId },
        data: staffData,
      });
    }

    if (Object.keys(profileData).length > 0) {
      await this.db.tx.profile.update({
        where: { id },
        data: profileData,
      });
    }

    return this.findOne(id, user);
  }

  @Transactional()
  async remove(id: string, user: TokenPayload) {
    const existing = await this.findOne(id, user);

    await this.db.tx.user.delete({
      where: { id: existing.data.userId },
    });

    await this.db.tx.profile.delete({
      where: { id },
    });

    return { message: 'Staff removed successfully' };
  }

  private resolveTenantId(
    dtoTenantId: string | undefined,
    user: TokenPayload,
  ): string {
    if (user.type === ProfileType.Admin) {
      if (!dtoTenantId) {
        throw new ConflictException('tenantId is required for admin');
      }
      return dtoTenantId;
    }

    if (!user.tenantId) {
      throw new ForbiddenException('Access denied');
    }

    return user.tenantId;
  }

  private formatStaffResponse(profile: any) {
    return {
      id: profile.id,
      name: profile.name,
      type: profile.type,
      tenantId: profile.tenantId,
      phoneNumber: profile.user?.phoneNumber,
      userId: profile.user?.id,
      staffId: profile.staff?.id,
      firstName: profile.staff?.firstName,
      middleName: profile.staff?.middleName,
      lastName: profile.staff?.lastName,
      email: profile.staff?.email,
      address: profile.staff?.address,
      sex: profile.staff?.sex,
      startingDate: profile.staff?.startingDate,
      position: profile.staff?.position,
      department: profile.staff?.department,
      verifiedAt: profile.staff?.verifiedAt,
      createdAt: profile.createdAt,
    };
  }
}
