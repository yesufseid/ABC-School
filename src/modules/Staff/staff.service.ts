import { ClsService } from 'nestjs-cls';
import { Transactional, TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { HashingService } from '../auth/hashing.service';
import { REQUEST_TENANT_ID } from '../auth/auth.constants';
import { ProfileType } from 'prisma/src/generated/prisma/enums';
import { CreateStaffDto } from './dtos/create-staff.dto';
import { UpdateStaffDto } from './dtos/update-staff.dto';
import {
  generatePassword,
  generateStaffId,
} from 'src/common/helpers/generator.helper';
import { Prisma } from 'prisma/src/generated/prisma/client';

@Injectable()
export class StaffService {
  constructor(
    private readonly cls: ClsService,
    private readonly db: TransactionHost<
      TransactionalAdapterPrisma<DatabaseService>
    >,
    private readonly databaseService: DatabaseService,
    private readonly hashingService: HashingService,
  ) {}

  @Transactional()
  async create(dto: CreateStaffDto) {
    const tenantId = this.getTenantId();

    const branch = await this.db.tx.branch.findUnique({
      where: { id: dto.branchId },
      select: { branchPrefix: true, tenantId: true },
    });

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

    const staffId = generateStaffId(branch.branchPrefix, new Date().getFullYear(), count + 1);
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
        userId: (
          await this.db.tx.user.create({
            data: {
              phoneNumber: dto.phoneNumber,
              password: hashedPassword,
            },
          })
        ).id,
      },
    });

    const staff = await this.db.tx.staff.create({
      data: {
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
        branchId: dto.branchId,
        profileId: profile.id,
      },
    });

    return { data: { id: staff.id, password: rawPassword } };
  }

  async findAll() {
    const staffs = await this.databaseService.staff.findMany({
      include: {
        profile: { include: { user: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { data: staffs.map((s) => this.formatStaffResponse(s)) };
  }

  async findOne(id: string) {
    const staff = await this.databaseService.staff.findFirst({
      where: { id },
      include: {
        profile: { include: { user: true } },
      },
    });

    if (!staff || !staff.profile) {
      throw new NotFoundException('Staff not found');
    }

    return { data: this.formatStaffResponse(staff) };
  }

  @Transactional()
  async update(id: string, dto: UpdateStaffDto) {
    const tenantId = this.getTenantId();

    const staff = await this.db.tx.staff.findFirst({
      where: { id, tenantId },
    });

    if (!staff) {
      throw new NotFoundException('Staff not found');
    }

    const updateData = this.buildStaffUpdate(dto);

    if (Object.keys(updateData).length > 0) {
      await this.db.tx.staff.update({
        where: { id, tenantId },
        data: updateData,
      });
    }

    return this.findOne(id);
  }

  @Transactional()
  async remove(id: string) {
    const tenantId = this.getTenantId();

    const staff = await this.db.tx.staff.findFirst({
      where: { id, tenantId },
      include: { profile: { include: { user: true } } },
    });

    if (!staff || !staff.profile) {
      throw new NotFoundException('Staff not found');
    }

    await this.db.tx.user.delete({
      where: { id: staff.profile.user.id },
    });

    return { message: 'Staff removed successfully' };
  }

  private getTenantId(): string {
    return this.cls.get<string>(REQUEST_TENANT_ID)!;
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
      phoneNumber: staff.profile.user.phoneNumber,
      userId: staff.profile.user.id,
      name: staff.profile?.name,
      type: staff.profile?.type,
      createdAt: staff.createdAt,
    };
  }
}
