import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

export enum SettingValueType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
}

/** Generic key/value store for runtime-tunable system settings. */
@Entity('system_settings')
export class SystemSettingEntity {
  @PrimaryColumn({ length: 80 })
  key!: string;

  @Column({ type: 'varchar', length: 255 })
  label!: string;

  @Column({ type: 'text' })
  value!: string;

  @Column({ type: 'varchar', length: 20, default: SettingValueType.STRING })
  valueType!: SettingValueType;

  @UpdateDateColumn()
  updatedAt!: Date;
}
