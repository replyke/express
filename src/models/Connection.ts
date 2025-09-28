import { Model, DataTypes, Sequelize, CreationOptional } from "sequelize";
import {
  IConnectionAttributes,
  IConnectionCreationAttributes,
} from "../interfaces/IConnection";
import User from "./User";

export default class Connection
  extends Model<IConnectionAttributes, IConnectionCreationAttributes>
  implements IConnectionAttributes
{
  declare id: string;
  declare projectId: string;
  declare requesterId: string;
  declare receiverId: string;
  declare status: "pending" | "accepted" | "declined";
  declare message?: string;
  declare respondedAt?: Date;
  declare createdAt: CreationOptional<Date>;

  static initModel(sequelize: Sequelize): void {
    Connection.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        projectId: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        requesterId: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        receiverId: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        status: {
          type: DataTypes.ENUM("pending", "accepted", "declined"),
          allowNull: false,
          defaultValue: "pending",
        },
        message: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        respondedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
        },
      },
      {
        sequelize,
        modelName: "Connection",
        tableName: "Connections",
        timestamps: true,
        updatedAt: false,
        indexes: [
          {
            unique: true,
            fields: ["projectId", "requesterId", "receiverId"],
            name: "idx_connection_unique",
          },
          {
            fields: ["projectId", "requesterId", "status"],
            name: "idx_connection_requester",
          },
          {
            fields: ["projectId", "receiverId", "status"],
            name: "idx_connection_receiver",
          },
          {
            fields: ["projectId", "status"],
            name: "idx_connection_status",
          },
          {
            fields: ["projectId", "createdAt"],
            name: "idx_connection_created",
          },
        ],
      }
    );
  }

  static associate(): void {
    Connection.belongsTo(User, {
      foreignKey: "requesterId",
      as: "requester",
      onDelete: "CASCADE",
    });

    Connection.belongsTo(User, {
      foreignKey: "receiverId",
      as: "receiver",
      onDelete: "CASCADE",
    });
  }
}