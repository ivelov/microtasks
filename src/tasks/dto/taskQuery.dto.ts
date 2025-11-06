import { Type } from 'class-transformer';
import { IsNumber, Max, Min } from 'class-validator';

export class TaskQueryDto {
  @IsNumber()
  @Type(() => Number)
  @Min(-90)
  @Max(90)
  lat: number;

  @IsNumber()
  @Type(() => Number)
  @Min(-180)
  @Max(180)
  lng: number;

  @IsNumber()
  @Type(() => Number)
  @Min(1)
  radius: number;
}
