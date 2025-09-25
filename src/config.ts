import { Sequelize } from "sequelize";
import { Request as ExReq } from "express";

import { IEntity, IUser, NotificationParams } from "./interfaces";

export interface UsageTrackingHandlersConfig {
  createEntity: (props: { projectId: string }) => Promise<void>;
  createComment: (props: { projectId: string }) => Promise<void>;
  uploadFile: (props: { projectId: string; fileSize: number }) => Promise<void>;
  requestNewAccessToken: (props: {
    projectId: string;
    userId: string;
  }) => Promise<void>;
}

interface WebhookResponse {
  valid: boolean;
  error?: string;
}
export interface WebhookHandlersConfig {
  userCreated: {
    before: (
      req: ExReq,
      payload: {
        projectId: string;
        stage: "before";
        data: Partial<IUser>;
      }
    ) => Promise<WebhookResponse>;
    after: (
      req: ExReq,
      payload: {
        projectId: string;
        stage: "after";
        data: Partial<IUser>;
      }
    ) => Promise<WebhookResponse>;
  };
  userUpdated: (
    req: ExReq,
    payload: {
      projectId: string;
      data: Partial<IUser>;
    }
  ) => Promise<WebhookResponse>;
  entityCreated: (
    req: ExReq,
    payload: {
      projectId: string;
      data: Partial<IEntity>;
      initiatorId: string | undefined;
    }
  ) => Promise<WebhookResponse>;
  entityUpdated: (
    req: ExReq,
    payload: {
      projectId: string;
      data: Partial<IEntity>;
      initiatorId: string | undefined;
    }
  ) => Promise<WebhookResponse>;
  notificationCreated: (
    req: ExReq,
    payload: {
      projectId: string;
      data: NotificationParams;
    }
  ) => Promise<void>;
}

export interface helpersConfig {
  createFile: (
    projectId: string,
    pathParts: string[],
    file: Buffer | Blob,
    contentType?: string
  ) => Promise<{
    id: string;
    path: string;
    fullPath: string;
    publicPath: string;
  }>;
}
export interface CoreConfig {
  accessTokenSecret: string;
  refreshTokenSecret: string;
  sequelize: Sequelize;
  usageTrackingHandlers: UsageTrackingHandlersConfig;
  webhookHandlers: WebhookHandlersConfig;
  helpers: helpersConfig;
}

let config: CoreConfig;

export function setCoreConfig(c: CoreConfig) {
  config = c;
}

export function getCoreConfig(): CoreConfig {
  if (!config) {
    throw new Error(
      "Core config has not been set. Please call setCoreConfig() at startup."
    );
  }
  return config;
}
