import { Module } from '@nestjs/common';
import { AuthModule } from './modules/auth/auth.module';
import { SubscriptionModule } from './modules/subscription/subscription.module';
import { TenantModule } from './modules/tenant/tenant.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { StaffModule } from './modules/Staff/staff.module';
import { RegistrationModule } from './modules/registration/registration.module';
import { TeacherModule } from './modules/teacher/teacher.module';
import { ScheduleModule } from './modules/schedule/schedule.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { AcademicsModule } from './modules/academics/academics.module';

@Module({
  imports: [
    AcademicsModule,
    AnalyticsModule,
    AttendanceModule,
    AuthModule,
    RegistrationModule,
    StaffModule,
    TeacherModule,
    ScheduleModule,
    TenantModule,
    SubscriptionModule,
  ],
})
export class FeatureModule {}
