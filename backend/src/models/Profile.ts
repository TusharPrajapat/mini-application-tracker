import {
  Model,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  NonAttribute,
} from "sequelize";
import sequelize from "../config/database";
import { UserRole } from "../types/commonEnum";
import type { Job } from "./Job";
import type { Application } from "./Application";

export class Profile extends Model<
  InferAttributes<Profile>,
  InferCreationAttributes<Profile>
> {
  declare id: CreationOptional<number>;
  declare auth_user_id: string;
  declare email: string;
  declare role: CreationOptional<UserRole>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;

  // Associations (populated via joins)
  declare jobs?: NonAttribute<Job[]>;
  declare applications?: NonAttribute<Application[]>;
}

Profile.init(
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    auth_user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      field: "auth_user_id",
    },
    email: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: "email",
    },
    role: {
      type: DataTypes.SMALLINT,
      allowNull: false,
      field: "role",
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
    tableName: "profiles",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    underscored: true,
  },
);
