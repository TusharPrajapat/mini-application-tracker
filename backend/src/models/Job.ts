import {
  Model,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  ForeignKey,
  NonAttribute,
} from 'sequelize';
import sequelize from '../config/database';
import { JobStatus } from '../types/commonEnum';
import type { Profile } from './Profile';
import type { Application } from './Application';

export class Job extends Model<
  InferAttributes<Job>,
  InferCreationAttributes<Job>
> {
  declare id: CreationOptional<number>;
  declare recruiter_id: ForeignKey<Profile['id']>;
  declare title: string;
  declare description: string;
  declare status: CreationOptional<JobStatus>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;

  // Associations (populated via joins)
  declare recruiter?: NonAttribute<Profile>;
  declare applications?: NonAttribute<Application[]>;
}

Job.init(
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    recruiter_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      field: 'recruiter_id',
      references: {
        model: 'profiles',
        key: 'id',
      },
    },
    title: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    status: {
      type: DataTypes.SMALLINT,
      allowNull: false,
      defaultValue: JobStatus.DRAFT,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'updated_at',
    },
  },
  {
    sequelize,
    tableName: 'jobs',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
  }
);
