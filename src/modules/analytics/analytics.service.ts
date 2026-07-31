import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { Decimal } from '@prisma/client/runtime/client';
import { ProfileType } from 'prisma/src/generated/prisma/enums';
import { TokenPayload } from '../auth/auth.types';

type SummaryStat = {
  id: string;
  label: string;
  value: number;
};

type ListWidget = {
  title: string;
  columns: { key: string; label: string }[];
  rows: Record<string, string | number>[];
};

@Injectable()
export class AnalyticsService {
  constructor(private readonly databaseService: DatabaseService) {}

  async getDashboardStats(user: TokenPayload) {
    switch (user.type) {
      case ProfileType.Admin:
        return { data: await this.getAdminStats() };
      case ProfileType.Owner:
        return { data: await this.getOwnerStats(user.tenantId) };
      case ProfileType.Principal:
      case ProfileType.VicePrincipal:
        return { data: await this.getPrincipalStats(user) };
      case ProfileType.Registrar:
        return { data: await this.getRegistrarStats(user.tenantId) };
      case ProfileType.HR:
        return { data: await this.getHRStats(user.tenantId) };
      case ProfileType.Counselor:
        return { data: await this.getCounselorStats(user.tenantId) };
      case ProfileType.Teacher:
        return { data: await this.getTeacherStats(user) };
      case ProfileType.Staff:
        return { data: await this.getStaffStats(user) };
      case ProfileType.Parent:
        return { data: await this.getParentStats(user) };
      case ProfileType.Student:
        return { data: await this.getStudentStats(user) };
      default:
        return { data: await this.getAdminStats() };
    }
  }

  private async getAdminStats() {
    const now = new Date();

    const [
      totalSchools,
      totalSubscriptionPlans,
      allTenantSubscriptions,
      totalActiveSubscriptions,
      subscriptionPlans,
      recentSubscriptions,
    ] = await Promise.all([
      this.databaseService.tenant.count(),

      this.databaseService.subscription.count(),

      this.databaseService.tenantSubscription.findMany({
        select: {
          paidAmount: true,
        },
      }),

      this.databaseService.tenantSubscription.count({
        where: { endDate: { gt: now } },
      }),

      this.databaseService.subscription.findMany({
        include: {
          _count: { select: { tenantSubscriptions: true } },
          tenantSubscriptions: {
            select: { paidAmount: true, endDate: true },
          },
        },
      }),

      this.databaseService.tenantSubscription.findMany({
        take: 5,
        orderBy: { startDate: 'desc' },
        include: {
          tenant: { select: { name: true } },
          subscription: { select: { name: true } },
        },
      }),
    ]);

    const totalRevenue = allTenantSubscriptions
      .reduce((acc, ts) => acc.add(ts.paidAmount), Decimal(0))
      .toNumber();

    const subscriptionsByPlan = subscriptionPlans.map((plan) => {
      const activeCount = plan.tenantSubscriptions.filter(
        (ts) => ts.endDate > now,
      ).length;
      const totalRevenue = plan.tenantSubscriptions.reduce(
        (sum, ts) => sum + ts.paidAmount.toNumber(),
        0,
      );
      return {
        subscriptionId: plan.id,
        name: plan.name,
        price: plan.price.toNumber(),
        tenantCount: plan._count.tenantSubscriptions,
        activeCount,
        totalRevenue,
      };
    });

    const formattedRecent = recentSubscriptions.map((ts) => ({
      schoolName: ts.tenant.name,
      planName: ts.subscription.name,
      startDate: ts.startDate.toISOString(),
      endDate: ts.endDate.toISOString(),
      paidAmount: ts.paidAmount.toNumber(),
    }));

    return {
      summary: [
        { id: 'schools', label: 'Total Schools', value: totalSchools },
        {
          id: 'subscription-plans',
          label: 'Subscription Plans',
          value: totalSubscriptionPlans,
        },
        {
          id: 'active-subscriptions',
          label: 'Active Subscriptions',
          value: totalActiveSubscriptions,
        },
        { id: 'revenue', label: 'Total Revenue', value: totalRevenue },
      ],
      plans: subscriptionsByPlan,
      recentSubscriptions: formattedRecent,
    };
  }

  private async getOwnerStats(tenantId?: string) {
    if (!tenantId) {
      throw new NotFoundException(`Owner is not linked to a tenant`);
    }

    const [
      students,
      teachers,
      staff,
      parents,
      branches,
      sections,
      recentSubscriptions,
    ] = await Promise.all([
      this.databaseService.student.count({ where: { tenantId } }),
      this.databaseService.teacher.count({ where: { tenantId } }),
      this.databaseService.staff.count({ where: { tenantId } }),
      this.databaseService.parent.count({ where: { tenantId } }),
      this.databaseService.branch.count({ where: { tenantId } }),
      this.databaseService.section.count({ where: { tenantId } }),
      this.databaseService.tenantSubscription.findMany({
        where: { tenantId },
        take: 5,
        orderBy: { startDate: 'desc' },
        include: {
          tenant: { select: { name: true } },
          subscription: { select: { name: true } },
        },
      }),
    ]);

    return {
      summary: [
        { id: 'students', label: 'Students', value: students },
        { id: 'teachers', label: 'Teachers', value: teachers },
        { id: 'staff', label: 'Staff', value: staff },
        { id: 'parents', label: 'Parents', value: parents },
        { id: 'branches', label: 'Branches', value: branches },
        { id: 'sections', label: 'Sections', value: sections },
      ],
      recentSubscriptions: recentSubscriptions.map((ts) => ({
        schoolName: ts.tenant.name,
        planName: ts.subscription.name,
        startDate: ts.startDate.toISOString(),
        endDate: ts.endDate.toISOString(),
        paidAmount: ts.paidAmount.toNumber(),
      })),
    };
  }

  private async getPrincipalStats(user: TokenPayload) {
    const branchId = await this.resolveBranchId(user, 'principal');

    if (!branchId) {
      throw new NotFoundException(`Principal is not linked to a branch`);
    }

    const [students, teachers, sections, events, sectionsDetail] =
      await Promise.all([
        this.databaseService.studentGrade.count({ where: { branchId } }),
        this.databaseService.teacher.count({ where: { branchId } }),
        this.databaseService.section.count({ where: { branchId } }),
        this.databaseService.eventBranch.count({ where: { branchId } }),
        this.databaseService.section.findMany({
          where: { branchId },
          orderBy: { name: 'asc' },
          include: {
            _count: { select: { students: true } },
          },
        }),
      ]);

    return {
      summary: [
        { id: 'students', label: 'Students', value: students },
        { id: 'teachers', label: 'Teachers', value: teachers },
        { id: 'sections', label: 'Sections', value: sections },
        { id: 'events', label: 'Events', value: events },
      ],
      list: this.sectionList(sectionsDetail),
    };
  }

  private async getRegistrarStats(tenantId?: string) {
    if (!tenantId) {
      throw new NotFoundException(`Registrar is not linked to a tenant`);
    }

    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const [students, enrolled, newThisYear, sections, recentAdmissions] =
      await Promise.all([
        this.databaseService.student.count({ where: { tenantId } }),
        this.databaseService.student.count({
          where: { tenantId, enrolled: true },
        }),
        this.databaseService.student.count({
          where: { tenantId, admissionDate: { gte: startOfYear } },
        }),
        this.databaseService.section.count({ where: { tenantId } }),
        this.databaseService.student.findMany({
          where: { tenantId },
          orderBy: { admissionDate: 'desc' },
          take: 5,
          select: {
            firstName: true,
            middleName: true,
            lastName: true,
            studentId: true,
            admissionDate: true,
            status: true,
          },
        }),
      ]);

    return {
      summary: [
        { id: 'students', label: 'Total Students', value: students },
        { id: 'enrolled', label: 'Enrolled', value: enrolled },
        { id: 'new-this-year', label: 'New This Year', value: newThisYear },
        { id: 'sections', label: 'Sections', value: sections },
      ],
      list: {
        title: 'Recent Admissions',
        columns: [
          { key: 'name', label: 'Student' },
          { key: 'studentId', label: 'ID' },
          { key: 'date', label: 'Admitted' },
          { key: 'status', label: 'Status' },
        ],
        rows: recentAdmissions.map((s) => ({
          name: this.fullName(s),
          studentId: s.studentId,
          date: s.admissionDate.toISOString().slice(0, 10),
          status: s.status,
        })),
      },
    };
  }

  private async getHRStats(tenantId?: string) {
    if (!tenantId) {
      throw new NotFoundException(`HR is not linked to a tenant`);
    }

    const { startOfDay, endOfDay } = this.dayBounds();

    const [staff, byDepartment, presentToday, totalToday] = await Promise.all([
      this.databaseService.staff.count({ where: { tenantId } }),
      this.databaseService.staff.groupBy({
        by: ['department'],
        where: { tenantId },
        _count: { _all: true },
      }),
      this.databaseService.staffAttendance.count({
        where: {
          tenantId,
          date: { gte: startOfDay, lt: endOfDay },
          status: 'PRESENT',
        },
      }),
      this.databaseService.staffAttendance.count({
        where: { tenantId, date: { gte: startOfDay, lt: endOfDay } },
      }),
    ]);

    const attendanceRate = totalToday
      ? Math.round((presentToday / totalToday) * 100)
      : 0;

    return {
      summary: [
        { id: 'staff', label: 'Total Staff', value: staff },
        { id: 'departments', label: 'Departments', value: byDepartment.length },
        { id: 'present-today', label: 'Present Today', value: presentToday },
        { id: 'attendance-rate', label: 'Attendance Rate', value: attendanceRate },
      ],
      list: {
        title: 'Staff by Department',
        columns: [
          { key: 'department', label: 'Department' },
          { key: 'count', label: 'Staff' },
        ],
        rows: byDepartment.map((d) => ({
          department: d.department ?? 'Other',
          count: d._count._all,
        })),
      },
    };
  }

  private async getCounselorStats(tenantId?: string) {
    if (!tenantId) {
      throw new NotFoundException(`Counselor is not linked to a tenant`);
    }

    const { startOfDay, endOfDay } = this.dayBounds();

    const [students, withdrawals, presentToday, totalToday, atRiskStudents] =
      await Promise.all([
        this.databaseService.student.count({ where: { tenantId } }),
        this.databaseService.student.count({
          where: { tenantId, status: 'WITHDRAWAL' },
        }),
        this.databaseService.attendanceRecord.count({
          where: {
            tenantId,
            date: { gte: startOfDay, lt: endOfDay },
            status: 'PRESENT',
          },
        }),
        this.databaseService.attendanceRecord.count({
          where: { tenantId, date: { gte: startOfDay, lt: endOfDay } },
        }),
        this.databaseService.student.findMany({
          where: { tenantId, status: { not: 'ACTIVE' } },
          take: 5,
          select: {
            firstName: true,
            middleName: true,
            lastName: true,
            studentId: true,
            status: true,
          },
        }),
      ]);

    const attendanceRate = totalToday
      ? Math.round((presentToday / totalToday) * 100)
      : 0;

    return {
      summary: [
        { id: 'students', label: 'Students', value: students },
        { id: 'withdrawals', label: 'Withdrawals', value: withdrawals },
        { id: 'attendance-rate', label: 'Attendance Rate', value: attendanceRate },
      ],
      list: {
        title: 'Students Needing Attention',
        columns: [
          { key: 'name', label: 'Student' },
          { key: 'studentId', label: 'ID' },
          { key: 'status', label: 'Status' },
        ],
        rows: atRiskStudents.map((s) => ({
          name: this.fullName(s),
          studentId: s.studentId,
          status: s.status,
        })),
      },
    };
  }

  private async getTeacherStats(user: TokenPayload) {
    const profile = await this.databaseService.profile.findUnique({
      where: { id: user.profileId },
      include: {
        teacher: { select: { id: true, weeklyPeriods: true } },
      },
    });

    const teacherId = profile?.teacher?.id;

    if (!teacherId) {
      throw new NotFoundException(`Teacher is not linked to a profile`);
    }

    const assignments =
      await this.databaseService.teacherSectionSubject.findMany({
        where: { teacherId },
        include: {
          section: { select: { name: true } },
          subject: { select: { name: true } },
        },
      });

    const sectionIds = [...new Set(assignments.map((a) => a.sectionId))];
    const subjectIds = [...new Set(assignments.map((a) => a.subjectId))];

    const myStudents =
      sectionIds.length > 0
        ? await this.databaseService.studentGrade.count({
            where: { sectionId: { in: sectionIds } },
          })
        : 0;

    return {
      summary: [
        { id: 'my-sections', label: 'My Sections', value: sectionIds.length },
        { id: 'my-students', label: 'My Students', value: myStudents },
        { id: 'my-subjects', label: 'My Subjects', value: subjectIds.length },
        {
          id: 'periods-per-week',
          label: 'Periods / Week',
          value: profile.teacher?.weeklyPeriods ?? 0,
        },
      ],
      list: {
        title: 'My Classes',
        columns: [
          { key: 'section', label: 'Section' },
          { key: 'subject', label: 'Subject' },
        ],
        rows: assignments.map((a) => ({
          section: a.section.name,
          subject: a.subject.name,
        })),
      },
    };
  }

  private async getStaffStats(user: TokenPayload) {
    const profile = await this.databaseService.profile.findUnique({
      where: { id: user.profileId },
      include: {
        staff: { select: { id: true, branchId: true } },
      },
    });

    const branchId = profile?.staff?.branchId;
    const staffId = profile?.staff?.id;

    if (!branchId || !staffId) {
      throw new NotFoundException(`Staff is not linked to a branch`);
    }

    const { startOfDay, endOfDay } = this.dayBounds();

    const [branchStaff, presentToday, myPresent, myTotal, staffList] =
      await Promise.all([
        this.databaseService.staff.count({ where: { branchId } }),
        this.databaseService.staffAttendance.count({
          where: {
            branchId,
            date: { gte: startOfDay, lt: endOfDay },
            status: 'PRESENT',
          },
        }),
        this.databaseService.staffAttendance.count({
          where: { profileId: user.profileId, status: 'PRESENT' },
        }),
        this.databaseService.staffAttendance.count({
          where: { profileId: user.profileId },
        }),
        this.databaseService.staff.findMany({
          where: { branchId },
          select: { firstName: true, lastName: true, position: true },
        }),
      ]);

    const myAttendanceRate = myTotal
      ? Math.round((myPresent / myTotal) * 100)
      : 0;

    return {
      summary: [
        { id: 'branch-staff', label: 'Branch Staff', value: branchStaff },
        { id: 'present-today', label: 'Present Today', value: presentToday },
        { id: 'my-attendance', label: 'My Attendance Rate', value: myAttendanceRate },
      ],
      list: {
        title: 'Branch Staff',
        columns: [
          { key: 'name', label: 'Name' },
          { key: 'position', label: 'Position' },
        ],
        rows: staffList.map((s) => ({
          name: `${s.firstName} ${s.lastName}`,
          position: s.position,
        })),
      },
    };
  }

  private async getParentStats(user: TokenPayload) {
    const profile = await this.databaseService.profile.findUnique({
      where: { id: user.profileId },
      include: {
        parents: {
          include: {
            students: { include: { student: true } },
          },
        },
      },
    });

    const children = profile?.parents?.students ?? [];

    const childrenStats = await Promise.all(
      children.map(async (sp) => {
        const student = sp.student;
        const [present, total, results] = await Promise.all([
          this.databaseService.attendanceRecord.count({
            where: { studentId: student.id, status: 'PRESENT' },
          }),
          this.databaseService.attendanceRecord.count({
            where: { studentId: student.id },
          }),
          this.databaseService.academicResult.aggregate({
            where: { studentId: student.id },
            _avg: { score: true },
          }),
        ]);
        return {
          name: `${student.firstName} ${student.lastName}`,
          grade: student.startingGrade,
          attendanceRate: total
            ? Math.round((present / total) * 100)
            : 0,
          avgScore: results._avg.score ? Math.round(results._avg.score) : 0,
        };
      }),
    );

    const avgAttendance = childrenStats.length
      ? Math.round(
          childrenStats.reduce((sum, c) => sum + c.attendanceRate, 0) /
            childrenStats.length,
        )
      : 0;
    const avgGrade = childrenStats.length
      ? Math.round(
          childrenStats.reduce((sum, c) => sum + c.avgScore, 0) /
            childrenStats.length,
        )
      : 0;

    return {
      summary: [
        { id: 'children', label: 'Children', value: children.length },
        { id: 'avg-attendance', label: 'Avg Attendance', value: avgAttendance },
        { id: 'avg-grade', label: 'Avg Score', value: avgGrade },
      ],
      list: {
        title: 'My Children',
        columns: [
          { key: 'name', label: 'Child' },
          { key: 'grade', label: 'Grade' },
          { key: 'attendance', label: 'Attendance' },
          { key: 'score', label: 'Avg Score' },
        ],
        rows: childrenStats.map((c) => ({
          name: c.name,
          grade: c.grade,
          attendance: `${c.attendanceRate}%`,
          score: c.avgScore,
        })),
      },
    };
  }

  private async getStudentStats(user: TokenPayload) {
    const profile = await this.databaseService.profile.findUnique({
      where: { id: user.profileId },
      include: {
        students: {
          select: { id: true, firstName: true, middleName: true, lastName: true },
        },
      },
    });

    const studentId = profile?.students?.id;

    if (!studentId) {
      throw new NotFoundException(`Student is not linked to a profile`);
    }

    const [present, total, results, classes, grades] = await Promise.all([
      this.databaseService.attendanceRecord.count({
        where: { studentId, status: 'PRESENT' },
      }),
      this.databaseService.attendanceRecord.count({
        where: { studentId },
      }),
      this.databaseService.academicResult.aggregate({
        where: { studentId },
        _avg: { score: true },
      }),
      this.databaseService.studentGrade.count({ where: { studentId } }),
      this.databaseService.academicResult.findMany({
        where: { studentId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          subject: { select: { name: true } },
          slot: { select: { name: true } },
          section: { select: { name: true } },
        },
      }),
    ]);

    const attendanceRate = total ? Math.round((present / total) * 100) : 0;
    const avgScore = results._avg.score ? Math.round(results._avg.score) : 0;

    return {
      summary: [
        { id: 'attendance', label: 'Attendance', value: attendanceRate },
        { id: 'avg-score', label: 'Avg Score', value: avgScore },
        { id: 'classes', label: 'Classes', value: classes },
      ],
      list: {
        title: 'Recent Grades',
        columns: [
          { key: 'subject', label: 'Subject' },
          { key: 'slot', label: 'Assessment' },
          { key: 'section', label: 'Section' },
          { key: 'score', label: 'Score' },
        ],
        rows: grades.map((g) => ({
          subject: g.subject.name,
          slot: g.slot.name,
          section: g.section.name,
          score: g.score,
        })),
      },
    };
  }

  private sectionList(
    sections: { name: string; _count: { students: number } }[],
  ): ListWidget {
    return {
      title: 'Students by Section',
      columns: [
        { key: 'section', label: 'Section' },
        { key: 'students', label: 'Students' },
      ],
      rows: sections.map((s) => ({
        section: s.name,
        students: s._count.students,
      })),
    };
  }

  private fullName(s: {
    firstName: string;
    middleName?: string | null;
    lastName: string;
  }) {
    return `${s.firstName} ${s.middleName ?? ''} ${s.lastName}`.trim();
  }

  private dayBounds() {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
    return { startOfDay, endOfDay };
  }

  private async resolveBranchId(
    user: TokenPayload,
    relation: 'principal' | 'teacher' | 'staff',
  ) {
    const profile = await this.databaseService.profile.findUnique({
      where: { id: user.profileId },
      select: {
        principal: { select: { branchId: true } },
        teacher: { select: { branchId: true } },
        staff: { select: { branchId: true } },
      },
    });

    const branchId =
      relation === 'principal'
        ? profile?.principal?.branchId
        : relation === 'teacher'
          ? profile?.teacher?.branchId
          : profile?.staff?.branchId;

    return branchId ?? null;
  }
}
