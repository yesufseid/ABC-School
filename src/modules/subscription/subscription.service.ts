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
    const existing = await this.databaseService.subscription.findUnique({
      where: { name: dto.name },
    });

    if (existing) {
      throw new ConflictException(`Subscription with name '${dto.name}' already exists`);
    }

    await this.db.tx.subscription.create({
      data: {
        name: dto.name,
        months: dto.months,
        price: dto.price,
        features: dto.features,
      },
    });

    return { message: 'Subscription created successfully' };
  }

  async findAll() {
    const subscriptions = await this.databaseService.subscription.findMany();
    return { data: subscriptions };
  }

  async findOne(id: string) {
    const subscription = await this.databaseService.subscription.findUnique({
      where: { id },
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription not found`);
    }

    return { data: subscription };
  }

  @Transactional()
  async update(id: string, dto: UpdateSubscriptionDto) {
    await this.findOne(id);

    if (dto.name) {
      const existing = await this.databaseService.subscription.findUnique({
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
    await this.findOne(id);

    await this.db.tx.subscription.delete({
      where: { id },
    });

    return { message: 'Subscription removed successfully' };
  }
}
