import { ApiProperty } from '@nestjs/swagger';

export class GuestListMemberDto {
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

  @ApiProperty()
  is_primary: boolean;

  @ApiProperty()
  created_at: Date;
}

export class GuestListGroupDto {
  @ApiProperty({ type: GuestListMemberDto })
  principal: GuestListMemberDto;

  @ApiProperty({ type: [GuestListMemberDto] })
  dependents: GuestListMemberDto[];

  @ApiProperty()
  attending: number;

  @ApiProperty()
  declined: number;

  @ApiProperty()
  pending: number;

  @ApiProperty({ enum: ['pending', 'answered'] })
  rsvp_status: 'pending' | 'answered';
}

