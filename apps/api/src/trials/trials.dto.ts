import { IsIn, IsOptional, IsString, IsUUID, Matches, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';
const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreateTrialDto {
  @IsUUID() leadId!: string;
  @IsUUID() lessonSessionId!: string;
}
export class CancelTrialDto {
  @Transform(trim) @IsString() @MinLength(3) @MaxLength(500) reason!: string;
}
export class RecordOutcomeDto {
  @IsIn(['ATTENDED', 'NO_SHOW']) status!: 'ATTENDED' | 'NO_SHOW';
  @IsOptional() @IsString() @MaxLength(4000) notes?: string;
  @Matches(/^\d{4}-\d{2}-\d{2}$/) nextFollowUpAt!: string;
  @Transform(trim) @IsString() @MinLength(3) @MaxLength(300) followUpAction!: string;
  @IsOptional() @IsString() @MaxLength(1200) messageDraft?: string;
}
export class CompleteFollowUpDto {
  @Transform(trim) @IsString() @MinLength(3) @MaxLength(500) completionNote!: string;
}
