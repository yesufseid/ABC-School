import { Transactional, TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateSubscriptionDto } from './dtos/create-subscription.dto';
import { UpdateSubscriptionDto } from './dtos/update-subscription.dto';

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    private readonly db: TransactionHost<
      TransactionalAdapterPrisma<DatabaseService>
    >,
    private readonly databaseService: DatabaseService,
  ) {}

  @Transactional()
  async create(dto: CreateSubscriptionDto) {
    const existing = await this.db.tx.subscription.findUnique({
      where: { name: dto.name },
    });

    if (existing) {
      throw new ConflictException(
        `Subscription with name '${dto.name}' already exists`,
      );
    }

    await this.db.tx.subscription.create({
      data: {
        name: dto.name,
        months: dto.months,
        price: dto.price,
        active: dto.active,
        features: dto.features,
      },
    });

    return { message: 'Subscription created successfully' };
  }

  async findAll() {
    const subscriptions = await this.databaseService.subscription.findMany();
    return {
      data: subscriptions.map((sub) => ({
        ...sub,
        price: sub.price.toNumber(),
      })),
    };
  }

  async findOne(id: string) {
    const subscription = await this.db.tx.subscription.findUnique({
      where: { id },
      include: { tenantSubscriptions: { include: { tenant: true } } },
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription not found`);
    }

    return {
      data: {
        ...subscription,
        price: subscription.price.toNumber(),
        tenantSubscriptions: subscription.tenantSubscriptions.map((ts) => ({
          ...ts,
          tenantName: ts.tenant.name,
          paidAmount: ts.paidAmount.toNumber(),
        })),
      },
    };
  }

  @Transactional()
  async update(id: string, dto: UpdateSubscriptionDto) {
    await this.findOne(id);

    if (dto.name) {
      const existing = await this.db.tx.subscription.findUnique({
        where: { name: dto.name },
      });

      if (existing && existing.id !== id) {
        throw new ConflictException(
          `Subscription with name '${dto.name}' already exists`,
        );
      }
    }

    await this.db.tx.subscription.update({
      where: { id },
      data: dto,
    });

    return { message: 'Subscription updated successfully' };
  }

  @Transactional()
  async remove(id: string) {
    const { data: subscription } = await this.findOne(id);

    if (subscription.tenantSubscriptions.length > 0) {
      throw new ConflictException(
        'Cannot delete subscription with active tenant subscriptions',
      );
    }

    await this.db.tx.subscription.delete({
      where: { id },
    });

    return { message: 'Subscription removed successfully' };
  }
}
