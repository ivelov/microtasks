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

  // In a real app, we'd get the user from the AuthGuard
  @IsUUID()
  userId: string;
}
