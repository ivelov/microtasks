import { DataSource } from 'typeorm';
import { getDataSourceOptions } from './typeorm.config';

export = new DataSource(getDataSourceOptions() as any);
