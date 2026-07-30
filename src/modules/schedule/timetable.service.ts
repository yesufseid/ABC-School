import { ClsService } from 'nestjs-cls';
import { Transactional, TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { REQUEST_TENANT_ID } from '../auth/auth.constants';
import { GenerateTimetableDto } from './dtos/generate-timetable.dto';
import { DayOfWeek, TimetableStatus } from 'prisma/src/generated/prisma/enums';

interface TenantSettings {
  workingDays?: string[];
  periodsPerDay?: number;
  periodDuration?: number;
  startTime?: string;
}

@Injectable()
export class TimetableService {
  constructor(
    private readonly cls: ClsService,
    private readonly db: TransactionHost<
      TransactionalAdapterPrisma<DatabaseService>
    >,
    private readonly databaseService: DatabaseService,
  ) {}

  @Transactional()
  async generate(dto: GenerateTimetableDto) {
    const tenantId = this.getTenantId();

    const section = await this.db.tx.section.findFirst({
      where: { id: dto.sectionId, tenantId },
      include: {
        grade: {
          include: {
            subjects: true,
          },
        },
      },
    });
    if (!section) throw new NotFoundException('Section not found');

    const existingActive = await this.db.tx.timetable.findFirst({
      where: {
        sectionId: dto.sectionId,
        year: dto.year,
        status: TimetableStatus.ACTIVE,
      },
    });

    const tenant = await this.db.tx.tenant.findUnique({
      where: { id: tenantId },
      select: { settings: true },
    });

    const settings = (tenant?.settings ?? {}) as TenantSettings;
    const workingDays: string[] = settings.workingDays ?? [
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
    ];
    const periodsPerDay = settings.periodsPerDay ?? 8;
    const periodDuration = settings.periodDuration ?? 45;
    const startTime = settings.startTime ?? '08:00';

    const subjects = section.grade.subjects;

    const teacherGrades = await this.db.tx.teacherGrade.findMany({
      where: { gradeId: section.gradeId },
      include: {
        teacher: true,
        subjects: true,
      },
    });

    const subjectTeacherMap = new Map<
      string,
      { teacherId: string; weeklyPeriods: number }[]
    >();
    for (const tg of teacherGrades) {
      for (const ts of tg.subjects) {
        if (!subjectTeacherMap.has(ts.subjectId)) {
          subjectTeacherMap.set(ts.subjectId, []);
        }
        subjectTeacherMap.get(ts.subjectId)!.push({
          teacherId: tg.teacherId,
          weeklyPeriods: tg.teacher.weeklyPeriods,
        });
      }
    }

    const teacherLoad = new Map<string, number>();
    const allTeachers = teacherGrades.map((tg) => tg.teacher);

    for (const t of allTeachers) {
      teacherLoad.set(t.id, 0);
    }

    const existingSlots: {
      dayOfWeek: DayOfWeek;
      periodNumber: number;
      teacherId: string;
    }[] = [];

    const dayOrder: Record<string, DayOfWeek> = {
      Monday: DayOfWeek.Monday,
      Tuesday: DayOfWeek.Tuesday,
      Wednesday: DayOfWeek.Wednesday,
      Thursday: DayOfWeek.Thursday,
      Friday: DayOfWeek.Friday,
      Saturday: DayOfWeek.Saturday,
      Sunday: DayOfWeek.Sunday,
    };

    const availableDays = workingDays
      .filter((d) => dayOrder[d])
      .map((d) => dayOrder[d]);

    const conflicts: string[] = [];
    const slotsToCreate: {
      dayOfWeek: DayOfWeek;
      periodNumber: number;
      startTime: string;
      endTime: string;
      subjectId: string;
      teacherId: string;
    }[] = [];

    const subjectsToSchedule = subjects
      .filter((s) => s.periodsPerWeek > 0)
      .sort((a, b) => {
        const aTeachers = subjectTeacherMap.get(a.id)?.length ?? 0;
        const bTeachers = subjectTeacherMap.get(b.id)?.length ?? 0;
        return aTeachers - bTeachers || b.periodsPerWeek - a.periodsPerWeek;
      });

    for (const subject of subjectsToSchedule) {
      const teachers = subjectTeacherMap.get(subject.id);
      if (!teachers || teachers.length === 0) {
        conflicts.push(`No teacher assigned for subject "${subject.name}"`);
        continue;
      }

      const periodsPerTeacher = Math.ceil(
        subject.periodsPerWeek / teachers.length,
      );
      let scheduled = 0;

      for (const teacher of teachers) {
        const currentLoad = teacherLoad.get(teacher.teacherId) ?? 0;
        const remainingCapacity = teacher.weeklyPeriods - currentLoad;
        const maxToSchedule = Math.min(
          periodsPerTeacher,
          subject.periodsPerWeek - scheduled,
          remainingCapacity,
        );

        for (let p = 0; p < maxToSchedule; p++) {
          let placed = false;

          for (const day of availableDays) {
            for (let periodNum = 1; periodNum <= periodsPerDay; periodNum++) {
              const isOccupied = existingSlots.some(
                (s) =>
                  s.dayOfWeek === day &&
                  s.periodNumber === periodNum &&
                  s.teacherId === teacher.teacherId,
              );
              if (isOccupied) continue;

              const [startH, startM] = startTime.split(':').map(Number);
              const totalMinutes =
                startH * 60 + startM + (periodNum - 1) * periodDuration;
              const endMinutes = totalMinutes + periodDuration;
              const fmtTime = (m: number) =>
                `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

              existingSlots.push({
                dayOfWeek: day,
                periodNumber: periodNum,
                teacherId: teacher.teacherId,
              });

              slotsToCreate.push({
                dayOfWeek: day,
                periodNumber: periodNum,
                startTime: fmtTime(totalMinutes),
                endTime: fmtTime(endMinutes),
                subjectId: subject.id,
                teacherId: teacher.teacherId,
              });

              teacherLoad.set(
                teacher.teacherId,
                (teacherLoad.get(teacher.teacherId) ?? 0) + 1,
              );
              scheduled++;
              placed = true;
              break;
            }
            if (placed) break;
          }

          if (!placed) {
            conflicts.push(
              `Could not place period ${scheduled + 1} for "${subject.name}" with teacher ${teacher.teacherId} — no available slot`,
            );
          }
        }

        if (scheduled >= subject.periodsPerWeek) break;
      }

      if (scheduled < subject.periodsPerWeek) {
        conflicts.push(
          `Only scheduled ${scheduled}/${subject.periodsPerWeek} periods for "${subject.name}"`,
        );
      }
    }

    let version = 1;
    if (existingActive) {
      version = existingActive.version + 1;
      await this.db.tx.timetable.update({
        where: { id: existingActive.id },
        data: { status: TimetableStatus.ARCHIVED },
      });
    }

    const timetable = await this.db.tx.timetable.create({
      data: {
        sectionId: dto.sectionId,
        year: dto.year,
        version,
        tenantId,
        status: conflicts.length > 0 ? TimetableStatus.DRAFT : TimetableStatus.ACTIVE,
        slots: {
          create: slotsToCreate.map((slot) => ({
            dayOfWeek: slot.dayOfWeek,
            periodNumber: slot.periodNumber,
            startTime: slot.startTime,
            endTime: slot.endTime,
            subjectId: slot.subjectId,
            teacherId: slot.teacherId,
          })),
        },
      },
      include: {
        slots: {
          include: {
            subject: true,
            teacher: true,
          },
        },
      },
    });

    return {
      data: timetable,
      ...(conflicts.length > 0 ? { conflicts } : {}),
    };
  }

  async findAll(query: { sectionId?: string; year?: string }) {
    const tenantId = this.getTenantId();
    const where: any = { tenantId };

    if (query.sectionId) where.sectionId = query.sectionId;
    if (query.year) where.year = query.year;

    const timetables = await this.databaseService.timetable.findMany({
      where,
      include: {
        section: { include: { grade: true } },
        _count: { select: { slots: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { data: timetables };
  }

  async findOne(id: string) {
    const tenantId = this.getTenantId();
    const timetable = await this.databaseService.timetable.findFirst({
      where: { id, tenantId },
      include: {
        section: { include: { grade: true } },
        slots: {
          include: { subject: true, teacher: true },
          orderBy: [{ dayOfWeek: 'asc' }, { periodNumber: 'asc' }],
        },
      },
    });
    if (!timetable) throw new NotFoundException('Timetable not found');
    return { data: timetable };
  }

  @Transactional()
  async activate(id: string) {
    const tenantId = this.getTenantId();
    const timetable = await this.db.tx.timetable.findFirst({
      where: { id, tenantId },
    });
    if (!timetable) throw new NotFoundException('Timetable not found');
    if (timetable.status === TimetableStatus.ACTIVE) {
      throw new BadRequestException('Timetable is already active');
    }

    const existingActive = await this.db.tx.timetable.findFirst({
      where: {
        sectionId: timetable.sectionId,
        year: timetable.year,
        status: TimetableStatus.ACTIVE,
        id: { not: id },
      },
    });

    if (existingActive) {
      await this.db.tx.timetable.update({
        where: { id: existingActive.id },
        data: { status: TimetableStatus.ARCHIVED },
      });
    }

    await this.db.tx.timetable.update({
      where: { id },
      data: { status: TimetableStatus.ACTIVE },
    });

    return this.findOne(id);
  }

  @Transactional()
  async remove(id: string) {
    const tenantId = this.getTenantId();
    const timetable = await this.db.tx.timetable.findFirst({
      where: { id, tenantId },
    });
    if (!timetable) throw new NotFoundException('Timetable not found');
    if (timetable.status === TimetableStatus.ACTIVE) {
      throw new BadRequestException('Cannot delete an active timetable');
    }

    await this.db.tx.timetable.delete({ where: { id } });
    return { message: 'Timetable deleted successfully' };
  }

  async getTeacherLoad(sectionId: string, year: string) {
    const tenantId = this.getTenantId();
    const timetable = await this.databaseService.timetable.findFirst({
      where: {
        sectionId,
        year,
        status: TimetableStatus.ACTIVE,
        tenantId,
      },
      include: {
        slots: {
          include: { teacher: true, subject: true },
        },
      },
    });

    if (!timetable) throw new NotFoundException('Active timetable not found');

    const loadMap = new Map<
      string,
      { teacherId: string; teacherName: string; periods: number; subjects: string[] }
    >();

    for (const slot of timetable.slots) {
      const key = slot.teacherId;
      if (!loadMap.has(key)) {
        loadMap.set(key, {
          teacherId: slot.teacher.id,
          teacherName: `${slot.teacher.firstName} ${slot.teacher.lastName}`,
          periods: 0,
          subjects: [],
        });
      }
      const entry = loadMap.get(key)!;
      entry.periods++;
      if (!entry.subjects.includes(slot.subject.name)) {
        entry.subjects.push(slot.subject.name);
      }
    }

    return { data: Array.from(loadMap.values()) };
  }

  private getTenantId(): string {
    return this.cls.get<string>(REQUEST_TENANT_ID)!;
  }
}
