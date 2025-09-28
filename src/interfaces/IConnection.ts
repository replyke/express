import { Model, Optional } from "sequelize";

export interface IConnectionAttributes {
  id: string;
  projectId: string;
  requesterId: string;
  receiverId: string;
  status: "pending" | "accepted" | "declined";
  message?: string;
  respondedAt?: Date;
  createdAt: Date;
}

export interface IConnectionCreationAttributes
  extends Optional<
    IConnectionAttributes,
    "id" | "createdAt" | "message" | "respondedAt"
  > {}

export default interface IConnection
  extends Model<IConnectionAttributes, IConnectionCreationAttributes>,
    IConnectionAttributes {}