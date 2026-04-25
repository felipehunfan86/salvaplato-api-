import { IsIn, IsOptional, IsString } from 'class-validator';
import { CreateOfferDto } from './create-offer.dto';
import { PartialType, OmitType } from '@nestjs/mapped-types';

export class UpdateOfferDto extends PartialType(
  OmitType(CreateOfferDto, ['restaurantId'] as const),
) {
  @IsOptional()
  @IsIn(['active', 'paused', 'closed'])
  status?: 'active' | 'paused' | 'closed';
}
