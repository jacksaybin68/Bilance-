import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ContentCategory {
  NEWS = 'news',
  ANNOUNCEMENT = 'announcement',
  PROMOTION = 'promotion',
}

export enum ContentStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

/** CMS article managed from the admin console (news / announcements / promos). */
@Entity('content_posts')
export class ContentPostEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 200 })
  title!: string;

  @Column({ type: 'varchar', length: 20, default: ContentCategory.NEWS })
  category!: ContentCategory;

  @Column({ type: 'varchar', length: 20, default: ContentStatus.DRAFT })
  status!: ContentStatus;

  @Column({ type: 'text' })
  content!: string;

  @Column({ type: 'uuid', nullable: true })
  authorId?: string | null;

  @Column({ type: 'varchar', length: 160, nullable: true })
  author?: string | null;

  @Column({ type: 'datetime', nullable: true })
  publishedAt?: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}