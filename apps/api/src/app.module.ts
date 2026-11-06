import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { DatabaseModule } from './database.module';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { StudentsController } from './students/students.controller';
import { StudentsService } from './students/students.service';
import { TrialsController } from './trials/trials.controller';
import { TrialsService } from './trials/trials.service';
import { ScheduleController } from './schedule/schedule.controller';
import { ScheduleService } from './schedule/schedule.service';
import { AiController } from './ai/ai.controller';
import { AiService } from './ai/ai.service';
import { HealthController } from './health.controller';

@Module({
  imports: [JwtModule.register({}), DatabaseModule],
  controllers: [
    AuthController,
    StudentsController,
    TrialsController,
    ScheduleController,
    AiController,
    HealthController,
  ],
  providers: [AuthService, StudentsService, TrialsService, ScheduleService, AiService],
})
export class AppModule {}
