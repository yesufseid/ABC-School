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
import {
  ProfileType,
  Relationship,
} from 'prisma/src/generated/prisma/enums';
import { CreateStudentDto } from './dtos/create-student.dto';
import { UpdateStudentDto } from './dtos/update-student.dto';
import { formatStudentId, generatePassword } from './student.helper';

@Injectable()
export class StudentService {
  private readonly logger = new Logger(StudentService.name);

  constructor(

    private readonly db: TransactionHost<
      TransactionalAdapterPrisma<DatabaseService>
    >,
    private readonly databaseService: DatabaseService,
    private readonly hashingService: HashingService,
  ) {}

  @Transactional()
  async create(dto: CreateStudentDto, tenantId: string) {
    const tenant = await this.db.tx.tenant.findUnique({
      where: { id: tenantId },
      select: { branchCode: true },
    });

    if (!tenant?.branchCode) {
      throw new ConflictException(
        'Tenant branch code is not configured. Set a branch code first.',
      );
    }

    const year = new Date().getFullYear();

    const counter = await this.db.tx.studentIdCounter.upsert({
      where: { branchCode_year: { branchCode: tenant.branchCode, year } },
      create: { branchCode: tenant.branchCode, year, lastSeq: 1 },
      update: { lastSeq: { increment: 1 } },
    });

    const studentId = formatStudentId(
      tenant.branchCode,
      year,
      counter.lastSeq,
    );
    const rawPassword = generatePassword();
    const hashedPassword = await this.hashingService.hash(rawPassword);

    const student = await this.db.tx.student.create({
      data: {
        firstName: dto.firstName,
        middleName: dto.middleName,
        lastName: dto.lastName,
        studentId,
        password: hashedPassword,
        admissionDate: new Date(dto.admissionDate),
        enrollmentDate: new Date(dto.enrollmentDate),
        gradeOfInterest: dto.gradeOfInterest,
        sex: dto.sex,
        address: dto.address,
        nationality: dto.nationality,
        previousSchool: dto.previousSchool,
        languagePreference: dto.languagePreference,
        phone: dto.phone,
        profile: {
          create: {
            name: `${dto.firstName} ${dto.lastName}`,
            type: ProfileType.Student,
            tenant: { connect: { id: tenantId } },
          },
        },
      },
    });

    if (dto.parents?.length) {
      for (const parentLink of dto.parents) {
        let parentId: string;

        const existingUser = await this.db.tx.user.findUnique({
          where: { phoneNumber: parentLink.phoneNumber },
        });

        if (existingUser) {
          const parent = await this.db.tx.parent.findUnique({
            where: { userId: existingUser.id },
          });

          if (!parent) {
            throw new NotFoundException(
              `Parent not found for phone '${parentLink.phoneNumber}'`,
            );
          }

          parentId = parent.id;
        } else {
          const parentPassword = generatePassword();
          const hashedParentPassword =
            await this.hashingService.hash(parentPassword);

          const user = await this.db.tx.user.create({
            data: {
              phoneNumber: parentLink.phoneNumber,
              password: hashedParentPassword,
            },
          });

          const parent = await this.db.tx.parent.create({
            data: {
              name: parentLink.name ?? 'Parent',
              sex: parentLink.sex,
              address: parentLink.address,
              nationality: parentLink.nationality,
              userId: user.id,
            },
          });

          parentId = parent.id;
        }

        await this.db.tx.studentParent.create({
          data: {
            studentId: student.id,
            parentId,
            relationship: parentLink.relationship as Relationship,
            isPrimary: parentLink.isPrimary ?? true,
          },
        });
      }
    }

    this.logger.log(
      `Student [${student.studentId}] temporary password: ${rawPassword}`,
    );

    return {
      message: 'Student registered successfully',
      data: { id: student.id },
    };
  }

  async findAll(tenantId: string) {
    const students = await this.databaseService.student.findMany({
      where: { profile: { tenantId } },
      omit: { password: true },
      include: {
        profile: true,
        parentLinks: {
          include: {
            parent: {
              include: { user: { omit: { password: true } } },
            },
          },
        },
      },
    });

    return { data: students };
  }

  async findOne(id: string, tenantId: string) {
    const student = await this.databaseService.student.findFirst({
      where: { id, profile: { tenantId } },
      omit: { password: true },
      include: {
        profile: true,
        parentLinks: {
          include: {
            parent: {
              include: { user: { omit: { password: true } } },
            },
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return { data: student };
  }

  @Transactional()
  async update(id: string, dto: UpdateStudentDto, tenantId: string) {
    await this.findOne(id, tenantId);

    await this.db.tx.student.update({ where: { id }, data: dto });

    return { message: 'Student updated successfully' };
  }

  @Transactional()
  async remove(id: string, tenantId: string) {
    await this.findOne(id, tenantId);

    await this.db.tx.studentParent.deleteMany({ where: { studentId: id } });
    await this.db.tx.student.delete({ where: { id } });

    return { message: 'Student removed successfully' };
  }
}
