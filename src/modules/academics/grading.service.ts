import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { Transactional, TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { DatabaseService } from '../database/database.service';
import { REQUEST_TENANT_ID } from '../auth/auth.constants';
import { CreateGradingRuleDto, UpdateGradingRuleDto } from './dtos/grading-rule.dto';

@Injectable()
export class GradingService {
  constructor(
    private readonly cls: ClsService,
    private readonly db: TransactionHost<
      TransactionalAdapterPrisma<DatabaseService>
    >,
    private readonly databaseService: DatabaseService,
  ) {}

  @Transactional()
  async createRule(dto: CreateGradingRuleDto) {
    const tenantId = this.getTenantId();

    const existing = await this.db.tx.gradingRule.findUnique({
      where: { tenantId_grade: { tenantId, grade: dto.grade } },
    });
    if (existing) {
      throw new BadRequestException(`Grading rule for grade "${dto.grade}" already exists`);
    }

    const rule = await this.db.tx.gradingRule.create({
      data: { ...dto, tenantId },
    });

    return { data: rule };
  }

  async findAllRules() {
    const tenantId = this.getTenantId();
    const rules = await this.databaseService.gradingRule.findMany({
      where: { tenantId },
      orderBy: { minMarks: 'desc' },
    });
    return { data: rules };
  }

  async findOneRule(id: string) {
    const tenantId = this.getTenantId();
    const rule = await this.databaseService.gradingRule.findFirst({
      where: { id, tenantId },
    });
    if (!rule) throw new NotFoundException('Grading rule not found');
    return { data: rule };
  }

  @Transactional()
  async updateRule(id: string, dto: UpdateGradingRuleDto) {
    const tenantId = this.getTenantId();
    const rule = await this.db.tx.gradingRule.findFirst({
      where: { id, tenantId },
    });
    if (!rule) throw new NotFoundException('Grading rule not found');

    const updated = await this.db.tx.gradingRule.update({
      where: { id },
      data: dto,
    });

    return { data: updated };
  }

  @Transactional()
  async removeRule(id: string) {
    const tenantId = this.getTenantId();
    const rule = await this.db.tx.gradingRule.findFirst({
      where: { id, tenantId },
    });
    if (!rule) throw new NotFoundException('Grading rule not found');

    await this.db.tx.gradingRule.delete({ where: { id } });
    return { message: 'Grading rule deleted' };
  }

  async computeGrade(totalScore: number) {
    const tenantId = this.getTenantId();
    const rules = await this.databaseService.gradingRule.findMany({
      where: { tenantId },
      orderBy: { minMarks: 'desc' },
    });

    for (const rule of rules) {
      if (totalScore >= rule.minMarks && totalScore <= rule.maxMarks) {
        return { grade: rule.grade, points: rule.points, isPass: rule.isPass };
      }
    }

    return { grade: 'F', points: 0, isPass: false };
  }

  private getTenantId(): string {
    return this.cls.get<string>(REQUEST_TENANT_ID)!;
  }
}
