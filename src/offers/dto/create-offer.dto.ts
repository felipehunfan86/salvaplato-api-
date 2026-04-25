import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateOfferDto {
  @IsUUID()
  restaurantId: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @IsPositive()
  originalPrice: number;

  @IsNumber()
  @IsPositive()
  offerPrice: number;

  @IsNumber()
  @Min(1)
  quantityTotal: number;

  @IsOptional()
  @IsString()
  emoji?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;

  @IsDateString()
  pickupDeadline: string;
}
