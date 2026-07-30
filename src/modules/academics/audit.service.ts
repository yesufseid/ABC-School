import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { DatabaseService } from '../database/database.service';
import { REQUEST_TENANT_ID } from '../auth/auth.constants';

@Injectable()
export class AuditService {
  constructor(
    private readonly cls: ClsService,
    private readonly databaseService: DatabaseService,
  ) {}

  async log(params: {
    action: string;
    performedBy: string;
    performedByRole: string;
    branchId: string;
    sectionId: string;
    resultId?: string;
    subjectId?: string;
    slotId?: string;
    studentId?: string;
    previousValue?: number;
    newValue?: number;
    reason?: string;
  }) {
    const tenantId = this.getTenantId();

    return this.databaseService.academicAuditLog.create({
      data: {
        action: params.action,
        performedBy: params.performedBy,
        performedByRole: params.performedByRole as any,
        branchId: params.branchId,
        sectionId: params.sectionId,
        resultId: params.resultId,
        subjectId: params.subjectId,
        slotId: params.slotId,
        studentId: params.studentId,
        previousValue: params.previousValue,
        newValue: params.newValue,
        reason: params.reason,
        tenantId,
      },
    });
  }

  async findAll(query: {
    action?: string;
    branchId?: string;
    sectionId?: string;
    studentId?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
  }) {
    const tenantId = this.getTenantId();
    const where: any = { tenantId };

    if (query.action) where.action = query.action;
    if (query.branchId) where.branchId = query.branchId;
    if (query.sectionId) where.sectionId = query.sectionId;
    if (query.studentId) where.studentId = query.studentId;
    if (query.dateFrom || query.dateTo) {
      where.createdAt = {};
      if (query.dateFrom) where.createdAt.gte = new Date(query.dateFrom);
      if (query.dateTo) where.createdAt.lte = new Date(query.dateTo);
    }

    const logs = await this.databaseService.academicAuditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: query.limit ?? 100,
    });

    return { data: logs };
  }

  private getTenantId(): string {
    return this.cls.get<string>(REQUEST_TENANT_ID)!;
  }
}
