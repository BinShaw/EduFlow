import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class FollowUpDraftDto {
  @IsUUID() trialBookingId!: string;
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(3)
  @MaxLength(4000)
  notes!: string;
  @IsOptional()
  @IsIn(['en-AU', 'zh-CN'])
  outputLanguage?: 'en-AU' | 'zh-CN';
}
