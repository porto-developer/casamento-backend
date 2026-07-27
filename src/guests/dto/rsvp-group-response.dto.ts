import { ApiProperty } from '@nestjs/swagger';

export class RsvpMemberDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiProperty({ nullable: true })
  phone: string | null;

  @ApiProperty({ nullable: true })
  document: string | null;

  @ApiProperty({ nullable: true })
  observation: string | null;

  @ApiProperty({ nullable: true })
  parent_guest_id: number | null;

  @ApiProperty({ nullable: true })
  will_attend: boolean | null;

  @ApiProperty({ nullable: true })
  rsvp_updated_at: Date | null;

  @ApiProperty({ description: 'true se for o convidado principal do convite' })
  is_primary: boolean;
}

export class RsvpGroupResponseDto {
  @ApiProperty({ type: [RsvpMemberDto] })
  members: RsvpMemberDto[];
}
