import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  ArrayMinSize,
  ValidateNested,
  IsInt,
  IsBoolean,
} from 'class-validator';

export class RsvpAttendeeDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  guest_id: number;

  @ApiProperty({ example: true })
  @IsBoolean()
  will_attend: boolean;
}

export class SubmitRsvpDto {
  @ApiProperty({ type: [RsvpAttendeeDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RsvpAttendeeDto)
  attendees: RsvpAttendeeDto[];
}
