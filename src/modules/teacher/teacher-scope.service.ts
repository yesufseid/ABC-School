import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { ProfileType } from 'prisma/src/generated/prisma/enums';
import { TokenPayload } from '../auth/auth.types';

@Injectable()
export class TeacherScopeService {
  constructor(private readonly databaseService: DatabaseService) {}

  async resolveTeacherId(profileId?: string): Promise<string> {
    const profile = await this.databaseService.profile.findUnique({
      where: { id: profileId },
      include: { teacher: { select: { id: true } } },
    });

    if (!profile?.teacher?.id) {
      throw new NotFoundException('Teacher is not linked to a profile');
    }

    return profile.teacher.id;
  }

  async getMyAssignments(profileId?: string) {
    const teacherId = await this.resolveTeacherId(profileId);

    return this.databaseService.teacherSectionSubject.findMany({
      where: { teacherId },
      include: {
        section: {
          select: {
            id: true,
            name: true,
            grade: { select: { grade: true } },
          },
        },
        subject: { select: { id: true, name: true } },
      },
      orderBy: [{ section: { name: 'asc' } }, { subject: { name: 'asc' } }],
    });
  }

  private async isAssignedToSection(
    profileId: string,
    sectionId: string,
  ): Promise<boolean> {
    const teacherId = await this.resolveTeacherId(profileId);

    const count = await this.databaseService.teacherSectionSubject.count({
      where: { teacherId, sectionId },
    });

    return count > 0;
  }

  private async isAssignedToSectionSubject(
    profileId: string,
    sectionId: string,
    subjectId: string,
  ): Promise<boolean> {
    const teacherId = await this.resolveTeacherId(profileId);

    const count = await this.databaseService.teacherSectionSubject.count({
      where: { teacherId, sectionId, subjectId },
    });

    return count > 0;
  }

  async assertSectionAccess(
    user: TokenPayload,
    sectionId: string,
  ): Promise<void> {
    if (user.type !== ProfileType.Teacher) return;

    if (!(await this.isAssignedToSection(user.profileId ?? '', sectionId))) {
      throw new ForbiddenException(
        'You do not have access to this section',
      );
    }
  }

  async assertSectionSubjectAccess(
    user: TokenPayload,
    sectionId: string,
    subjectId: string,
  ): Promise<void> {
    if (user.type !== ProfileType.Teacher) return;

    if (
      !(await this.isAssignedToSectionSubject(
        user.profileId ?? '',
        sectionId,
        subjectId,
      ))
    ) {
      throw new ForbiddenException(
        'You do not have access to this section and subject',
      );
    }
  }
}
