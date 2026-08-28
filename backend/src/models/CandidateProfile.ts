import {
  Model,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  NonAttribute,
} from "sequelize";
import sequelize from "../config/database";
import type { Profile } from "./Profile";

export class CandidateProfile extends Model<
  InferAttributes<CandidateProfile>,
  InferCreationAttributes<CandidateProfile>
> {
  declare id: CreationOptional<number>;
  declare profile_id: number;
  declare full_name: string;
  declare phone: CreationOptional<string | null>;
  declare skills: CreationOptional<string | null>;
  declare experience: CreationOptional<string | null>;
  declare resume_path: CreationOptional<string | null>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;

  // Association (populated via joins)
  declare profile?: NonAttribute<Profile>;
}

CandidateProfile.init(
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    profile_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      unique: true,
      field: "profile_id",
    },
    full_name: {
      type: DataTypes.STRING(150),
      allowNull: false,
      field: "full_name",
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: "phone",
    },
    skills: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "skills",
    },
    experience: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "experience",
    },
    resume_path: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "resume_path",
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: "created_at",
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: "updated_at",
    },
  },
  {
    sequelize,
    tableName: "candidate_profiles",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    underscored: true,
  }
);
