import {
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateRestaurantDto {
  @IsString()
  name: string;

  @IsString()
  rif: string;

  @IsString()
  ownerName: string;

  @IsString()
  phone: string;

  @IsString()
  address: string;

  @IsNumber()
  @Min(-90) @Max(90)
  latitude: number;

  @IsNumber()
  @Min(-180) @Max(180)
  longitude: number;

  @IsString()
  cuisineType: string;

  @IsOptional()
  @IsObject()
  schedule?: Record<string, string>;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  coverPhotoUrl?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  instagram?: string;
}
