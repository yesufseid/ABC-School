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
  StudentParentRelation,
  StudentStatus,
} from 'prisma/src/generated/prisma/enums';
import { CreateStudentDto } from './dtos/create-student.dto';
import { UpdateStudentDto } from './dtos/update-student.dto';
import { ReAdmitDto } from './dtos/re-admit.dto';
import { formatStudentId, generatePassword } from '../../common/helpers/generator.helper';

@Injectable()
export class RegistrationService {
  private readonly logger = new Logger(RegistrationService.name);

  constructor(
    private readonly db: TransactionHost<
      TransactionalAdapterPrisma<DatabaseService>
    >,
    private readonly databaseService: DatabaseService,
    private readonly hashingService: HashingService,
  ) {}

  @Transactional()
  async create(dto: CreateStudentDto, tenantId: string) {
    const branch = await this.db.tx.branch.findFirst({
      where: { tenantId },
      select: { id: true, branchCode: true },
    });
    if (!branch) {
      throw new ConflictException('No branch configured for this tenant.');
    }

    await this.checkDuplicate(dto, tenantId);

    const studentId = await this.generateStudentId(branch.branchCode, tenantId);
    const rawPassword = generatePassword();
    const hashedPassword = await this.hashingService.hash(rawPassword);

    const studentPhone = dto.phone ?? `stu-${studentId}@internal`;
    const studentUser = await this.db.tx.user.create({
      data: {
        phoneNumber: studentPhone,
        password: hashedPassword,
      },
    });

    const student = await this.db.tx.student.create({
      data: {
        firstName: dto.firstName,
        middleName: dto.middleName,
        lastName: dto.lastName,
        dateOfBirth: new Date(dto.dateOfBirth),
        startingGrade: dto.startingGrade,
        enrollmentDate: new Date(dto.enrollmentDate),
        admissionDate: new Date(dto.admissionDate),
        sex: dto.sex,
        address: dto.address,
        nationality: dto.nationality,
        previousSchool: dto.previousSchool,
        languagePreference: dto.languagePreference,
        phone: dto.phone,
        studentId,
        password: hashedPassword,
        status: StudentStatus.ACTIVE_DOCS_PENDING,
        profile: {
          create: {
            name: `${dto.firstName} ${dto.lastName}`,
            type: ProfileType.Student,
            user: { connect: { id: studentUser.id } },
            tenant: { connect: { id: tenantId } },
          },
        },
        tenant: { connect: { id: tenantId } },
      },
    });

    for (const parentLink of dto.parents) {
      await this.upsertParent(parentLink, student.id, tenantId);
    }

    this.logger.log(`Student [${student.studentId}] created, password: ${rawPassword}`);

    return {
      message: 'Student registered successfully',
      data: {
        id: student.id,
        studentId: student.studentId,
        temporaryPassword: rawPassword,
        status: StudentStatus.ACTIVE_DOCS_PENDING,
      },
    };
  }

  async findAll(tenantId: string) {
    const students = await this.databaseService.student.findMany({
      where: { tenantId },
      omit: { password: true },
      include: {
        profile: true,
        parents: {
          include: { parent: true },
        },
        grades: true,
      },
    });
    return { data: students };
  }

  async findOne(id: string, tenantId: string) {
    const student = await this.databaseService.student.findFirst({
      where: { id, tenantId },
      omit: { password: true },
      include: {
        profile: true,
        parents: {
          include: { parent: true },
        },
        grades: true,
      },
    });
    if (!student) throw new NotFoundException('Student not found');
    return { data: student };
  }

  async search(query: string, tenantId: string) {
    const students = await this.databaseService.student.findMany({
      where: {
        tenantId,
        OR: [
          { studentId: { contains: query, mode: 'insensitive' } },
          { firstName: { contains: query, mode: 'insensitive' } },
          { middleName: { contains: query, mode: 'insensitive' } },
          { lastName: { contains: query, mode: 'insensitive' } },
        ],
      },
      omit: { password: true },
      take: 20,
    });
    return { data: students };
  }

  async searchParents(phone?: string, name?: string, tenantId?: string) {
    const where: any = {};
    if (phone) where.phone = phone;
    if (name) where.name = { contains: name, mode: 'insensitive' };
    if (tenantId) where.tenantId = tenantId;

    const parents = await this.databaseService.parent.findMany({
      where,
      include: { students: { include: { student: true } } },
    });
    return { data: parents };
  }

  async getConfirmation(id: string, tenantId: string) {
    const student = await this.databaseService.student.findFirst({
      where: { id, tenantId },
      omit: { password: true },
      include: {
        parents: { include: { parent: true } },
        grades: true,
      },
    });
    if (!student) throw new NotFoundException('Student not found');

    return {
      data: {
        studentId: student.studentId,
        fullName: `${student.firstName} ${student.middleName} ${student.lastName}`,
        dateOfBirth: student.dateOfBirth,
        grade: student.startingGrade,
        enrollmentDate: student.enrollmentDate,
        status: student.status,
        parents: student.parents.map((sp) => ({
          name: sp.parent.name,
          phone: sp.parent.phone,
          relation: sp.relation,
        })),
        uploadLink: `/upload/student/${student.id}`,
      },
    };
  }

  @Transactional()
  async reAdmit(id: string, dto: ReAdmitDto, tenantId: string) {
    const student = await this.databaseService.student.findFirst({
      where: { id, tenantId },
    });
    if (!student) throw new NotFoundException('Student not found');

    const updateData: any = { enrolled: true, status: StudentStatus.ACTIVE };

    if (dto.startingGrade) updateData.startingGrade = dto.startingGrade;
    if (dto.address) updateData.address = dto.address;

    await this.db.tx.student.update({ where: { id }, data: updateData });

    if (dto.branchId) {
      await this.db.tx.studentGrade.create({
        data: {
          grade: dto.startingGrade ?? student.startingGrade,
          section: 'A',
          year: String(new Date().getFullYear()),
          studentCode: student.studentId,
          student: { connect: { id } },
          branch: { connect: { id: dto.branchId } },
        },
      });
    }

    this.logger.log(`Student [${student.studentId}] re-admitted, scenario: ${dto.scenario}`);

    return { message: 'Student re-admitted successfully' };
  }

  @Transactional()
  async update(id: string, dto: UpdateStudentDto, tenantId: string) {
    await this.findOne(id, tenantId);

    const { parents, ...scalars } = dto as any;
    await this.db.tx.student.update({ where: { id }, data: scalars });

    return { message: 'Student updated successfully' };
  }

  @Transactional()
  async remove(id: string, tenantId: string) {
    const student = await this.databaseService.student.findFirst({
      where: { id, tenantId },
    });
    if (!student) throw new NotFoundException('Student not found');

    await this.db.tx.studentParent.deleteMany({ where: { studentId: id } });
    await this.db.tx.student.delete({ where: { id } });

    return { message: 'Student removed successfully' };
  }

  // --- private helpers ---

  private async checkDuplicate(dto: CreateStudentDto, tenantId: string) {
    const existing = await this.databaseService.student.findFirst({
      where: {
        tenantId,
        firstName: dto.firstName,
        lastName: dto.lastName,
        dateOfBirth: new Date(dto.dateOfBirth),
      },
    });
    if (!existing) return;

    for (const parentLink of dto.parents) {
      const parent = await this.databaseService.parent.findUnique({
        where: { phone: parentLink.phoneNumber },
      });
      if (parent) {
        throw new ConflictException(
          `Duplicate student detected. Existing student ID: ${existing.studentId}`,
        );
      }
    }
  }

  private async generateStudentId(branchCode: string, tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.databaseService.student.count({ where: { tenantId } });
    return formatStudentId(branchCode, year, count + 1);
  }

  private async generateParentId(tenantId: string): Promise<string> {
    const branch = await this.databaseService.branch.findFirst({
      where: { tenantId },
      select: { branchCode: true },
    });
    const count = await this.databaseService.parent.count({ where: { tenantId } });
    return `${branch?.branchCode ?? 'XX'}-PRN-${String(count + 1).padStart(2, '0')}`;
  }

  private async upsertParent(
    parentLink: CreateStudentDto['parents'][0],
    studentId: string,
    tenantId: string,
  ) {
    const existingParent = await this.databaseService.parent.findUnique({
      where: { phone: parentLink.phoneNumber },
    });

    if (existingParent) {
      await this.db.tx.studentParent.create({
        data: {
          studentId,
          parentId: existingParent.id,
          relation: parentLink.relation as StudentParentRelation,
        },
      });
      return;
    }

    const parentPassword = generatePassword();
    const hashedPassword = await this.hashingService.hash(parentPassword);

    const user = await this.db.tx.user.create({
      data: {
        phoneNumber: parentLink.phoneNumber,
        password: hashedPassword,
      },
    });

    const parent = await this.db.tx.parent.create({
      data: {
        name: parentLink.name,
        sex: parentLink.sex,
        address: parentLink.address,
        nationality: parentLink.nationality,
        phone: parentLink.phoneNumber,
        parentId: await this.generateParentId(tenantId),
        user: { connect: { id: user.id } },
        profile: {
          create: {
            name: parentLink.name,
            type: ProfileType.Parent,
            user: { connect: { id: user.id } },
            tenant: { connect: { id: tenantId } },
          },
        },
        tenant: { connect: { id: tenantId } },
      },
    });

    await this.db.tx.studentParent.create({
      data: {
        studentId,
        parentId: parent.id,
        relation: parentLink.relation as StudentParentRelation,
      },
    });

    this.logger.log(
      `Parent [${parentLink.phoneNumber}] created, password: ${parentPassword}`,
    );
  }
}
