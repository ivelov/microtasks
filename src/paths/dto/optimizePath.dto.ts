import { IsArray, IsNumber, IsUUID, Max, Min } from 'class-validator';

export class OptimizePathDto {
  @IsArray()
  @IsUUID('4', { each: true })
  taskIds: string[];

  @IsNumber()
  @Min(-90)
  @Max(90)
  startLatitude: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  startLongitude: number;

  @IsNumber()
  @Min(1)
  maxTimeMinutes: number;

  @IsNumber()
  @Min(1)
  movementSpeed: number;
}
