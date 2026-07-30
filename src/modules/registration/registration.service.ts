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
import { CreateSectionDto } from './dtos/create-section.dto';
import { UpdateSectionDto } from './dtos/update-section.dto';
import { AssignSectionDto } from './dtos/assign-section.dto';
import { AutoAssignSectionDto, AutoAssignMode } from './dtos/auto-assign-section.dto';
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
      let sectionId = dto.sectionId;
      if (!sectionId) {
        const section = await this.db.tx.section.findFirst({
          where: { branchId: dto.branchId, year: String(new Date().getFullYear()), tenantId },
        });
        if (section) sectionId = section.id;
      }

      const data: any = {
        grade: dto.startingGrade ?? student.startingGrade,
        year: String(new Date().getFullYear()),
        studentCode: student.studentId,
        studentId: id,
        branchId: dto.branchId,
      };
      if (sectionId) data.sectionId = sectionId;

      await this.db.tx.studentGrade.create({ data });
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

  // --- Section management ---

  @Transactional()
  async createSection(dto: CreateSectionDto, tenantId: string) {
    const grade = await this.db.tx.grade.findFirst({
      where: { id: dto.gradeId, tenantId },
    });
    if (!grade) throw new NotFoundException('Grade not found');

    const branch = await this.db.tx.branch.findFirst({
      where: { id: dto.branchId, tenantId },
    });
    if (!branch) throw new NotFoundException('Branch not found');

    const existing = await this.db.tx.section.findUnique({
      where: {
        branchId_gradeId_year_name: {
          branchId: dto.branchId,
          gradeId: dto.gradeId,
          year: dto.year,
          name: dto.name,
        },
      },
    });
    if (existing) {
      throw new ConflictException(`Section ${dto.name} already exists for this grade, branch, and year`);
    }

    const section = await this.db.tx.section.create({
      data: {
        name: dto.name,
        year: dto.year,
        capacity: dto.capacity,
        gradeId: dto.gradeId,
        branchId: dto.branchId,
        tenantId,
      },
    });

    return { data: section };
  }

  async findAllSections(gradeId?: string, branchId?: string, year?: string, tenantId?: string) {
    const where: any = {};
    if (gradeId) where.gradeId = gradeId;
    if (branchId) where.branchId = branchId;
    if (year) where.year = year;
    if (tenantId) where.tenantId = tenantId;

    const sections = await this.databaseService.section.findMany({
      where,
      include: {
        grade: true,
        branch: true,
        _count: { select: { students: true } },
      },
      orderBy: [{ gradeId: 'asc' }, { name: 'asc' }],
    });

    return {
      data: sections.map((s) => ({
        ...s,
        assignedCount: s._count.students,
      })),
    };
  }

  async findOneSection(id: string, tenantId: string) {
    const section = await this.databaseService.section.findFirst({
      where: { id, tenantId },
      include: {
        grade: true,
        branch: true,
        _count: { select: { students: true } },
      },
    });
    if (!section) throw new NotFoundException('Section not found');

    return {
      data: { ...section, assignedCount: section._count.students },
    };
  }

  async listSectionStudents(id: string, tenantId: string) {
    const section = await this.databaseService.section.findFirst({
      where: { id, tenantId },
    });
    if (!section) throw new NotFoundException('Section not found');

    const grades = await this.databaseService.studentGrade.findMany({
      where: { sectionId: id },
      include: {
        student: { include: { profile: true } },
      },
    });

    return {
      data: grades.map((g) => ({
        studentId: g.student.id,
        studentCode: g.student.studentId,
        firstName: g.student.firstName,
        middleName: g.student.middleName,
        lastName: g.student.lastName,
        sex: g.student.sex,
      })),
    };
  }

  @Transactional()
  async updateSection(id: string, dto: UpdateSectionDto, tenantId: string) {
    const section = await this.db.tx.section.findFirst({ where: { id, tenantId } });
    if (!section) throw new NotFoundException('Section not found');

    const { gradeId, branchId, ...rest } = dto as any;
    if (Object.keys(rest).length === 0) {
      return { message: 'No changes provided' };
    }

    await this.db.tx.section.update({ where: { id }, data: rest });
    return this.findOneSection(id, tenantId);
  }

  @Transactional()
  async removeSection(id: string, tenantId: string) {
    const section = await this.db.tx.section.findFirst({
      where: { id, tenantId },
      include: { _count: { select: { students: true } } },
    });
    if (!section) throw new NotFoundException('Section not found');
    if (section._count.students > 0) {
      throw new ConflictException('Cannot delete section with assigned students');
    }

    await this.db.tx.section.delete({ where: { id } });
    return { message: 'Section deleted successfully' };
  }

  @Transactional()
  async assignStudents(dto: AssignSectionDto, tenantId: string) {
    const section = await this.db.tx.section.findFirst({
      where: { id: dto.sectionId, tenantId },
      include: {
        grade: true,
        _count: { select: { students: true } },
      },
    });
    if (!section) throw new NotFoundException('Section not found');

    const currentCount = section._count.students;
    if (currentCount + dto.studentIds.length > section.capacity) {
      throw new ConflictException(
        `Section ${section.name} capacity (${section.capacity}) exceeded. ` +
        `Currently ${currentCount} assigned, trying to add ${dto.studentIds.length}.`,
      );
    }

    for (const studentId of dto.studentIds) {
      const student = await this.db.tx.student.findFirst({
        where: { id: studentId, tenantId },
      });
      if (!student) {
        throw new NotFoundException(`Student ${studentId} not found`);
      }
    }

    const created = await this.db.tx.studentGrade.createMany({
      data: dto.studentIds.map((studentId) => ({
        grade: section.grade.grade,
        year: section.year,
        studentCode: '',
        studentId,
        sectionId: dto.sectionId,
        branchId: section.branchId,
      })),
    });

    return {
      message: `${created.count} student(s) assigned to section ${section.name}`,
    };
  }

  @Transactional()
  async autoAssignPreview(dto: AutoAssignSectionDto, tenantId: string) {
    const sections = await this.db.tx.section.findMany({
      where: {
        gradeId: dto.gradeId,
        branchId: dto.branchId,
        year: dto.year,
        tenantId,
      },
      include: {
        grade: true,
        _count: { select: { students: true } },
      },
      orderBy: { name: 'asc' },
    });

    if (sections.length === 0) {
      throw new NotFoundException('No sections found for this grade, branch, and year');
    }

    const assignedIds = await this.db.tx.studentGrade.findMany({
      where: {
        section: {
          gradeId: dto.gradeId,
          branchId: dto.branchId,
          year: dto.year,
          tenantId,
        },
      },
      select: { studentId: true },
    });
    const assignedSet = new Set(assignedIds.map((a) => a.studentId));

    const allStudents = await this.db.tx.student.findMany({
      where: {
        tenantId,
        startingGrade: sections[0].grade.grade,
      },
      select: { id: true, sex: true },
    });

    const unassigned = allStudents.filter((s) => !assignedSet.has(s.id));
    if (unassigned.length === 0) {
      throw new ConflictException('All students are already assigned to sections');
    }

    const availableCapacity = sections.reduce(
      (sum, s) => sum + (s.capacity - s._count.students),
      0,
    );
    if (unassigned.length > availableCapacity) {
      throw new ConflictException(
        `Not enough capacity across sections (${availableCapacity}) for ${unassigned.length} unassigned students`,
      );
    }

    const plan = this.buildAutoAssignPlan(sections, unassigned, dto.mode);

    return {
      plan: plan.map((p) => ({
        sectionId: p.section.id,
        sectionName: p.section.name,
        studentIds: p.studentIds,
      })),
      summary: {
        totalUnassigned: unassigned.length,
        sections: plan.map((p) => ({
          name: p.section.name,
          currentCount: p.section._count.students,
          newCount: p.studentIds.length,
          totalAfter: p.section._count.students + p.studentIds.length,
          capacity: p.section.capacity,
        })),
      },
    };
  }

  @Transactional()
  async confirmAutoAssign(
    plan: { sectionId: string; studentIds: string[] }[],
    tenantId: string,
  ) {
    let totalAssigned = 0;

    for (const item of plan) {
      const section = await this.db.tx.section.findFirst({
        where: { id: item.sectionId, tenantId },
        include: {
          grade: true,
          _count: { select: { students: true } },
        },
      });
      if (!section) throw new NotFoundException(`Section ${item.sectionId} not found`);

      if (section._count.students + item.studentIds.length > section.capacity) {
        throw new ConflictException(
          `Section ${section.name} would exceed capacity (${section.capacity})`,
        );
      }

      for (const studentId of item.studentIds) {
        const student = await this.db.tx.student.findFirst({
          where: { id: studentId, tenantId },
        });
        if (!student) throw new NotFoundException(`Student ${studentId} not found`);
      }

      const result = await this.db.tx.studentGrade.createMany({
        data: item.studentIds.map((studentId) => ({
          grade: section.grade.grade,
          year: section.year,
          studentCode: '',
          studentId,
          sectionId: item.sectionId,
          branchId: section.branchId,
        })),
      });

      totalAssigned += result.count;
    }

    return { message: `${totalAssigned} student(s) assigned successfully` };
  }

  private buildAutoAssignPlan(
    sections: any[],
    students: { id: string; sex: string }[],
    mode: AutoAssignMode,
  ) {
    const slots = sections.map((s) => ({
      section: s,
      studentIds: [] as string[],
      available: s.capacity - s._count.students,
    }));

    const shuffled = [...students];

    if (mode === AutoAssignMode.GENDER_RATIO) {
      const males = shuffled.filter((s) => s.sex === 'Male');
      const females = shuffled.filter((s) => s.sex === 'Female');
      const others = shuffled.filter((s) => s.sex !== 'Male' && s.sex !== 'Female');

      let idx = 0;
      while (males.length > 0 || females.length > 0 || others.length > 0) {
        const slot = slots[idx % slots.length];
        if (slot.available <= 0) { idx++; continue; }

        const pick = others.pop() ?? males.pop() ?? females.pop();
        if (!pick) break;

        slot.studentIds.push(pick.id);
        slot.available--;
        idx++;
      }
    } else {
      for (let i = 0; i < shuffled.length; i++) {
        const slot = slots[i % slots.length];
        if (slot.available <= 0) continue;
        slot.studentIds.push(shuffled[i].id);
        slot.available--;
      }
    }

    return slots;
  }
}
