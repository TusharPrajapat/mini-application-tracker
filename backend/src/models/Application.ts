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
import { ApplicationStage } from '../types/commonEnum';
import type { Job } from './Job';
import type { Profile } from './Profile';

export class Application extends Model<
  InferAttributes<Application>,
  InferCreationAttributes<Application>
> {
  declare id: CreationOptional<number>;
  declare job_id: ForeignKey<Job['id']>;
  declare candidate_id: ForeignKey<Profile['id']>;
  declare resume_path: string | null;
  declare stage: CreationOptional<ApplicationStage>;
  declare version: CreationOptional<number>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;

  // Associations (populated via joins)
  declare job?: NonAttribute<Job>;
  declare candidate?: NonAttribute<Profile>;
}

Application.init(
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    job_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      field: 'job_id',
      references: {
        model: 'jobs',
        key: 'id',
      },
    },
    candidate_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      field: 'candidate_id',
      references: {
        model: 'profiles',
        key: 'id',
      },
    },
    resume_path: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'resume_path',
    },
    stage: {
      type: DataTypes.SMALLINT,
      allowNull: false,
      defaultValue: ApplicationStage.APPLIED,
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
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
    tableName: 'applications',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
  }
);
