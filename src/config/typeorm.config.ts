import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

export function getDataSourceOptions(): TypeOrmModuleOptions {
  const dataSourceOptions: any = {
    logging: process.env.DB_LOGGING as any,
    type: 'postgres',
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    database: process.env.DB_DATABASE,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    entities: [__dirname + '/../**/*.entity.{js,ts}'],
    migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],
    cli: {
      migrationsDir: './src/database/migrations',
    },
  };

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return dataSourceOptions;
}
