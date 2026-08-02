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
import { TeacherScopeService } from './teacher-scope.service';
import { ProfileType } from 'prisma/src/generated/prisma/enums';
import { TokenPayload } from '../auth/auth.types';
import { CreateTeacherDto } from './dtos/create-teacher.dto';
import { UpdateTeacherDto } from './dtos/update-teacher.dto';
import { CreateGradeDto } from './dtos/create-grade.dto';
import { UpdateGradeDto } from './dtos/update-grade.dto';
import {
  generatePassword,
  generateTeacherId,
} from 'src/common/helpers/generator.helper';

@Injectable()
export class TeacherService {
  private readonly logger = new Logger(TeacherService.name);

  constructor(
    private readonly cls: ClsService,
    private readonly db: TransactionHost<
      TransactionalAdapterPrisma<DatabaseService>
    >,
    private readonly databaseService: DatabaseService,
    private readonly hashingService: HashingService,
    private readonly teacherScopeService: TeacherScopeService,
  ) {}

  // --- Grade / Subject management ---

  async createGrade(dto: CreateGradeDto) {
    const tenantId = this.getTenantId();

    const existing = await this.databaseService.grade.findUnique({
      where: { tenantId_grade: { tenantId, grade: dto.grade } },
    });
    if (existing) {
      throw new ConflictException(`Grade ${dto.grade} already exists`);
    }

    const grade = await this.databaseService.grade.create({
      data: {
        grade: dto.grade,
        tenantId,
        subjects: {
          create: dto.subjects.map((s) => ({ name: s.name })),
        },
      },
      include: { subjects: true },
    });

    return { data: grade };
  }

  async findAllGrades() {
    const tenantId = this.getTenantId();
    const grades = await this.databaseService.grade.findMany({
      where: { tenantId },
      include: { subjects: true },
      orderBy: { grade: 'asc' },
    });
    return { data: grades };
  }

  async findOneGrade(id: string) {
    const tenantId = this.getTenantId();
    const grade = await this.databaseService.grade.findFirst({
      where: { id, tenantId },
      include: { subjects: true },
    });
    if (!grade) throw new NotFoundException('Grade not found');
    return { data: grade };
  }

  @Transactional()
  async updateGrade(id: string, dto: UpdateGradeDto) {
    const tenantId = this.getTenantId();
    const grade = await this.db.tx.grade.findFirst({ where: { id, tenantId } });
    if (!grade) throw new NotFoundException('Grade not found');

    if (dto.subjects) {
      await this.db.tx.subject.deleteMany({ where: { gradeId: id } });
      await this.db.tx.subject.createMany({
        data: dto.subjects.map((s) => ({ name: s.name, gradeId: id })),
      });
    }

    if (dto.grade !== undefined) {
      const existing = await this.db.tx.grade.findUnique({
        where: { tenantId_grade: { tenantId, grade: dto.grade } },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(`Grade ${dto.grade} already exists`);
      }
      await this.db.tx.grade.update({ where: { id }, data: { grade: dto.grade } });
    }

    return this.findOneGrade(id);
  }

  @Transactional()
  async removeGrade(id: string) {
    const tenantId = this.getTenantId();
    const grade = await this.db.tx.grade.findFirst({ where: { id, tenantId } });
    if (!grade) throw new NotFoundException('Grade not found');

    const teacherCount = await this.db.tx.teacherGrade.count({
      where: { gradeId: id },
    });
    if (teacherCount > 0) {
      throw new ConflictException(
        'Cannot delete grade assigned to teachers',
      );
    }

    await this.db.tx.grade.delete({ where: { id } });
    return { message: 'Grade deleted successfully' };
  }

  // --- Teacher admission ---

  @Transactional()
  async create(dto: CreateTeacherDto) {
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
        'Teacher with this phone number already exists',
      );
    }

    for (const gradeLink of dto.grades) {
      const grade = await this.db.tx.grade.findFirst({
        where: { id: gradeLink.gradeId, tenantId },
      });
      if (!grade) {
        throw new NotFoundException(
          `Grade ${gradeLink.gradeId} not found`,
        );
      }

      const validSubjectIds = (
        await this.db.tx.subject.findMany({
          where: { id: { in: gradeLink.subjectIds }, gradeId: grade.id },
          select: { id: true },
        })
      ).map((s) => s.id);

      for (const sid of gradeLink.subjectIds) {
        if (!validSubjectIds.includes(sid)) {
          throw new NotFoundException(
            `Subject ${sid} not found in grade ${grade.grade}`,
          );
        }
      }
    }

    const count = await this.db.tx.teacher.count({ where: { tenantId } });
    const teacherId = generateTeacherId(branch.branchPrefix, count + 1);
    const rawPassword = generatePassword();
    const hashedPassword = await this.hashingService.hash(rawPassword);

    const fullName = dto.middleName
      ? `${dto.firstName} ${dto.middleName} ${dto.lastName}`
      : `${dto.firstName} ${dto.lastName}`;

    const profile = await this.db.tx.profile.create({
      data: {
        name: fullName,
        type: ProfileType.Teacher,
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

    await this.db.tx.teacher.create({
      data: {
        teacherId,
        firstName: dto.firstName,
        middleName: dto.middleName,
        lastName: dto.lastName,
        phone: dto.phone,
        email: dto.email,
        address: dto.address,
        sex: dto.sex,
        startingDate: new Date(dto.startingDate),
        weeklyPeriods: dto.weeklyPeriods,
        profileId: profile.id,
        tenantId,
        branchId: dto.branchId,
        grades: {
          create: dto.grades.map((gl) => ({
            gradeId: gl.gradeId,
            subjects: {
              create: gl.subjectIds.map((sid) => ({ subjectId: sid })),
            },
          })),
        },
      },
    });

    const tenant = await this.databaseService.tenant.findUnique({
      where: { id: tenantId },
      select: { settings: true },
    });
    const maxPeriods = (tenant?.settings as any)?.maxWeeklyPeriods;
    let warning: string | undefined;
    if (maxPeriods && dto.weeklyPeriods > maxPeriods) {
      warning = `Weekly periods (${dto.weeklyPeriods}) exceed the configured maximum (${maxPeriods}). Please confirm with the principal.`;
    }

    this.logger.log(`Teacher [${teacherId}] admitted`);

    return {
      message: 'Teacher admitted successfully',
      data: { teacherId, temporaryPassword: rawPassword, ...(warning ? { warning } : {}) },
    };
  }

  async findAll() {
    const teachers = await this.databaseService
      .getExtendedClient()
      .teacher.findMany({
        include: {
          profile: { include: { user: true } },
          grades: {
            include: { grade: true, subjects: { include: { subject: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

    return { data: teachers.map((t) => this.formatTeacherResponse(t)) };
  }

  async findOne(id: string, user?: TokenPayload) {
    const teacher = await this.databaseService
      .getExtendedClient()
      .teacher.findFirst({
        where: { id },
        include: {
          profile: { include: { user: true } },
          grades: {
            include: { grade: true, subjects: { include: { subject: true } } },
          },
        },
      });

    if (!teacher || !teacher.profile) {
      throw new NotFoundException('Teacher not found');
    }

    if (user?.type === ProfileType.Teacher) {
      const teacherId = await this.teacherScopeService.resolveTeacherId(
        user.profileId,
      );
      if (teacher.id !== teacherId) {
        throw new NotFoundException('Teacher not found');
      }
    }

    return { data: this.formatTeacherResponse(teacher) };
  }

  async getMyScope(user: TokenPayload) {
    const teacherId = await this.teacherScopeService.resolveTeacherId(
      user.profileId,
    );

    const teacher = await this.databaseService.teacher.findFirst({
      where: { id: teacherId },
      include: {
        profile: { include: { user: true } },
        grades: {
          include: { grade: true, subjects: { include: { subject: true } } },
        },
      },
    });

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    const assignments =
      await this.teacherScopeService.getMyAssignments(user.profileId);

    const sectionIds = [...new Set(assignments.map((a) => a.sectionId))];
    const subjectIds = [...new Set(assignments.map((a) => a.subjectId))];

    const myStudents =
      sectionIds.length > 0
        ? await this.databaseService.studentGrade.count({
            where: { sectionId: { in: sectionIds } },
          })
        : 0;

    return {
      data: {
        ...this.formatTeacherResponse(teacher),
        sections: assignments.map((a) => ({
          sectionId: a.sectionId,
          sectionName: a.section.name,
          grade: a.section.grade.grade,
          subjectId: a.subjectId,
          subjectName: a.subject.name,
          isHomeroom: a.isHomeroom,
        })),
        summary: {
          mySections: sectionIds.length,
          myStudents,
          mySubjects: subjectIds.length,
          weeklyPeriods: teacher.weeklyPeriods,
        },
      },
    };
  }

  async getMySections(user: TokenPayload) {
    const assignments =
      await this.teacherScopeService.getMyAssignments(user.profileId);

    return {
      data: assignments.map((a) => ({
        sectionId: a.sectionId,
        sectionName: a.section.name,
        grade: a.section.grade.grade,
        subjectId: a.subjectId,
        subjectName: a.subject.name,
        isHomeroom: a.isHomeroom,
      })),
    };
  }

  async getMyStudents(user: TokenPayload) {
    const assignments =
      await this.teacherScopeService.getMyAssignments(user.profileId);

    const sectionIds = [...new Set(assignments.map((a) => a.sectionId))];

    if (sectionIds.length === 0) {
      return { data: [] };
    }

    const studentGrades = await this.databaseService.studentGrade.findMany({
      where: { sectionId: { in: sectionIds } },
      include: {
        student: true,
        section: {
          select: {
            id: true,
            name: true,
            grade: { select: { grade: true } },
          },
        },
      },
      orderBy: [{ section: { name: 'asc' } }, { studentCode: 'asc' }],
    });

    return {
      data: studentGrades.map((sg) => ({
        studentId: sg.student.id,
        studentCode: sg.studentCode,
        studentName: `${sg.student.firstName} ${sg.student.lastName}`,
        sectionId: sg.sectionId,
        sectionName: sg.section.name,
        grade: sg.section.grade.grade,
        photoUrl: sg.student.photoUrl,
      })),
    };
  }

  async getMyTimetable(user: TokenPayload) {
    const teacherId = await this.teacherScopeService.resolveTeacherId(
      user.profileId,
    );

    const slots = await this.databaseService.timetableSlot.findMany({
      where: { teacherId },
      include: {
        timetable: {
          select: {
            year: true,
            status: true,
            section: {
              select: {
                id: true,
                name: true,
                grade: { select: { grade: true } },
              },
            },
          },
        },
        subject: { select: { id: true, name: true } },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { periodNumber: 'asc' }],
    });

    const dayOrder: Record<string, number> = {
      Monday: 1,
      Tuesday: 2,
      Wednesday: 3,
      Thursday: 4,
      Friday: 5,
      Saturday: 6,
      Sunday: 7,
    };

    const days = Array.from(new Set(slots.map((s) => s.dayOfWeek))).sort(
      (a, b) => dayOrder[a] - dayOrder[b],
    );

    const daysData = days.map((day) => ({
      dayOfWeek: day,
      periods: slots
        .filter((s) => s.dayOfWeek === day)
        .map((s) => ({
          periodNumber: s.periodNumber,
          startTime: s.startTime,
          endTime: s.endTime,
          subjectId: s.subject?.id,
          subjectName: s.subject?.name,
          sectionId: s.timetable?.section?.id,
          sectionName: s.timetable?.section?.name,
          grade: s.timetable?.section?.grade?.grade,
          year: s.timetable?.year,
        })),
    }));

    return { data: daysData };
  }

  @Transactional()
  async update(id: string, dto: UpdateTeacherDto) {
    const tenantId = this.getTenantId();
    const teacher = await this.db.tx.teacher.findFirst({
      where: { id, tenantId },
    });
    if (!teacher) throw new NotFoundException('Teacher not found');

    if (dto.grades) {
      await this.db.tx.teacherSubject.deleteMany({
        where: { grade: { teacherId: id } },
      });
      await this.db.tx.teacherGrade.deleteMany({ where: { teacherId: id } });

      for (const gl of dto.grades) {
        await this.db.tx.teacherGrade.create({
          data: {
            teacherId: id,
            gradeId: gl.gradeId,
            subjects: {
              create: gl.subjectIds.map((sid) => ({ subjectId: sid })),
            },
          },
        });
      }
    }

    const { grades, ...scalars } = dto as any;
    if (Object.keys(scalars).length > 0) {
      if (scalars.startingDate) scalars.startingDate = new Date(scalars.startingDate);
      await this.db.tx.teacher.update({ where: { id }, data: scalars });
    }

    return this.findOne(id);
  }

  @Transactional()
  async remove(id: string) {
    const tenantId = this.getTenantId();
    const teacher = await this.db.tx.teacher.findFirst({
      where: { id, tenantId },
      include: { profile: { include: { user: true } } },
    });
    if (!teacher || !teacher.profile) {
      throw new NotFoundException('Teacher not found');
    }

    await this.db.tx.user.delete({
      where: { id: teacher.profile.user.id },
    });

    return { message: 'Teacher removed successfully' };
  }

  private getTenantId(): string {
    return this.cls.get<string>(REQUEST_TENANT_ID)!;
  }

  private formatTeacherResponse(teacher: any) {
    return {
      id: teacher.id,
      teacherId: teacher.teacherId,
      firstName: teacher.firstName,
      middleName: teacher.middleName,
      lastName: teacher.lastName,
      phone: teacher.phone,
      email: teacher.email,
      address: teacher.address,
      sex: teacher.sex,
      startingDate: teacher.startingDate,
      weeklyPeriods: teacher.weeklyPeriods,
      photoUrl: teacher.photoUrl,
      documentKeys: teacher.documentKeys,
      branchId: teacher.branchId,
      tenantId: teacher.tenantId,
      phoneNumber: teacher.profile?.user?.phoneNumber,
      userId: teacher.profile?.user?.id,
      name: teacher.profile?.name,
      type: teacher.profile?.type,
      grades: teacher.grades?.map((tg: any) => ({
        id: tg.id,
        grade: tg.grade?.grade,
        gradeId: tg.gradeId,
        subjects: tg.subjects?.map((ts: any) => ({
          id: ts.id,
          name: ts.subject?.name,
          subjectId: ts.subjectId,
        })),
      })),
      createdAt: teacher.createdAt,
    };
  }
}
