import * as jspb from 'google-protobuf'

import * as google_protobuf_struct_pb from 'google-protobuf/google/protobuf/struct_pb'; // proto import: "google/protobuf/struct.proto"
import * as google_protobuf_timestamp_pb from 'google-protobuf/google/protobuf/timestamp_pb'; // proto import: "google/protobuf/timestamp.proto"


export class Message extends jspb.Message {
  getId(): string;
  setId(value: string): Message;

  getConversationId(): string;
  setConversationId(value: string): Message;

  getRole(): MessageRole;
  setRole(value: MessageRole): Message;

  getContent(): string;
  setContent(value: string): Message;

  getMetadata(): google_protobuf_struct_pb.Struct | undefined;
  setMetadata(value?: google_protobuf_struct_pb.Struct): Message;
  hasMetadata(): boolean;
  clearMetadata(): Message;

  getSequenceNumber(): number;
  setSequenceNumber(value: number): Message;

  getCreatedAt(): google_protobuf_timestamp_pb.Timestamp | undefined;
  setCreatedAt(value?: google_protobuf_timestamp_pb.Timestamp): Message;
  hasCreatedAt(): boolean;
  clearCreatedAt(): Message;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Message.AsObject;
  static toObject(includeInstance: boolean, msg: Message): Message.AsObject;
  static serializeBinaryToWriter(message: Message, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Message;
  static deserializeBinaryFromReader(message: Message, reader: jspb.BinaryReader): Message;
}

export namespace Message {
  export type AsObject = {
    id: string;
    conversationId: string;
    role: MessageRole;
    content: string;
    metadata?: google_protobuf_struct_pb.Struct.AsObject;
    sequenceNumber: number;
    createdAt?: google_protobuf_timestamp_pb.Timestamp.AsObject;
  };
}

export class Conversation extends jspb.Message {
  getId(): string;
  setId(value: string): Conversation;

  getUserId(): string;
  setUserId(value: string): Conversation;

  getStatus(): ConversationStatus;
  setStatus(value: ConversationStatus): Conversation;

  getTitle(): string;
  setTitle(value: string): Conversation;

  getMetadata(): google_protobuf_struct_pb.Struct | undefined;
  setMetadata(value?: google_protobuf_struct_pb.Struct): Conversation;
  hasMetadata(): boolean;
  clearMetadata(): Conversation;

  getCreatedAt(): google_protobuf_timestamp_pb.Timestamp | undefined;
  setCreatedAt(value?: google_protobuf_timestamp_pb.Timestamp): Conversation;
  hasCreatedAt(): boolean;
  clearCreatedAt(): Conversation;

  getUpdatedAt(): google_protobuf_timestamp_pb.Timestamp | undefined;
  setUpdatedAt(value?: google_protobuf_timestamp_pb.Timestamp): Conversation;
  hasUpdatedAt(): boolean;
  clearUpdatedAt(): Conversation;

  getMessagesList(): Array<Message>;
  setMessagesList(value: Array<Message>): Conversation;
  clearMessagesList(): Conversation;
  addMessages(value?: Message, index?: number): Message;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Conversation.AsObject;
  static toObject(includeInstance: boolean, msg: Conversation): Conversation.AsObject;
  static serializeBinaryToWriter(message: Conversation, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Conversation;
  static deserializeBinaryFromReader(message: Conversation, reader: jspb.BinaryReader): Conversation;
}

export namespace Conversation {
  export type AsObject = {
    id: string;
    userId: string;
    status: ConversationStatus;
    title: string;
    metadata?: google_protobuf_struct_pb.Struct.AsObject;
    createdAt?: google_protobuf_timestamp_pb.Timestamp.AsObject;
    updatedAt?: google_protobuf_timestamp_pb.Timestamp.AsObject;
    messagesList: Array<Message.AsObject>;
  };
}

export class ListConversationsRequest extends jspb.Message {
  getUserId(): string;
  setUserId(value: string): ListConversationsRequest;

  getPageSize(): number;
  setPageSize(value: number): ListConversationsRequest;

  getPageToken(): string;
  setPageToken(value: string): ListConversationsRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ListConversationsRequest.AsObject;
  static toObject(includeInstance: boolean, msg: ListConversationsRequest): ListConversationsRequest.AsObject;
  static serializeBinaryToWriter(message: ListConversationsRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ListConversationsRequest;
  static deserializeBinaryFromReader(message: ListConversationsRequest, reader: jspb.BinaryReader): ListConversationsRequest;
}

export namespace ListConversationsRequest {
  export type AsObject = {
    userId: string;
    pageSize: number;
    pageToken: string;
  };
}

export class ListConversationsResponse extends jspb.Message {
  getConversationsList(): Array<Conversation>;
  setConversationsList(value: Array<Conversation>): ListConversationsResponse;
  clearConversationsList(): ListConversationsResponse;
  addConversations(value?: Conversation, index?: number): Conversation;

  getNextPageToken(): string;
  setNextPageToken(value: string): ListConversationsResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ListConversationsResponse.AsObject;
  static toObject(includeInstance: boolean, msg: ListConversationsResponse): ListConversationsResponse.AsObject;
  static serializeBinaryToWriter(message: ListConversationsResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ListConversationsResponse;
  static deserializeBinaryFromReader(message: ListConversationsResponse, reader: jspb.BinaryReader): ListConversationsResponse;
}

export namespace ListConversationsResponse {
  export type AsObject = {
    conversationsList: Array<Conversation.AsObject>;
    nextPageToken: string;
  };
}

export class GetConversationRequest extends jspb.Message {
  getConversationId(): string;
  setConversationId(value: string): GetConversationRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): GetConversationRequest.AsObject;
  static toObject(includeInstance: boolean, msg: GetConversationRequest): GetConversationRequest.AsObject;
  static serializeBinaryToWriter(message: GetConversationRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): GetConversationRequest;
  static deserializeBinaryFromReader(message: GetConversationRequest, reader: jspb.BinaryReader): GetConversationRequest;
}

export namespace GetConversationRequest {
  export type AsObject = {
    conversationId: string;
  };
}

export class GetConversationResponse extends jspb.Message {
  getConversation(): Conversation | undefined;
  setConversation(value?: Conversation): GetConversationResponse;
  hasConversation(): boolean;
  clearConversation(): GetConversationResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): GetConversationResponse.AsObject;
  static toObject(includeInstance: boolean, msg: GetConversationResponse): GetConversationResponse.AsObject;
  static serializeBinaryToWriter(message: GetConversationResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): GetConversationResponse;
  static deserializeBinaryFromReader(message: GetConversationResponse, reader: jspb.BinaryReader): GetConversationResponse;
}

export namespace GetConversationResponse {
  export type AsObject = {
    conversation?: Conversation.AsObject;
  };
}

export class UpsertConversationRequest extends jspb.Message {
  getConversationId(): string;
  setConversationId(value: string): UpsertConversationRequest;

  getUserId(): string;
  setUserId(value: string): UpsertConversationRequest;

  getMessage(): Message | undefined;
  setMessage(value?: Message): UpsertConversationRequest;
  hasMessage(): boolean;
  clearMessage(): UpsertConversationRequest;

  getIdempotencyKey(): string;
  setIdempotencyKey(value: string): UpsertConversationRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): UpsertConversationRequest.AsObject;
  static toObject(includeInstance: boolean, msg: UpsertConversationRequest): UpsertConversationRequest.AsObject;
  static serializeBinaryToWriter(message: UpsertConversationRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): UpsertConversationRequest;
  static deserializeBinaryFromReader(message: UpsertConversationRequest, reader: jspb.BinaryReader): UpsertConversationRequest;
}

export namespace UpsertConversationRequest {
  export type AsObject = {
    conversationId: string;
    userId: string;
    message?: Message.AsObject;
    idempotencyKey: string;
  };
}

export class UpsertConversationResponse extends jspb.Message {
  getConversation(): Conversation | undefined;
  setConversation(value?: Conversation): UpsertConversationResponse;
  hasConversation(): boolean;
  clearConversation(): UpsertConversationResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): UpsertConversationResponse.AsObject;
  static toObject(includeInstance: boolean, msg: UpsertConversationResponse): UpsertConversationResponse.AsObject;
  static serializeBinaryToWriter(message: UpsertConversationResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): UpsertConversationResponse;
  static deserializeBinaryFromReader(message: UpsertConversationResponse, reader: jspb.BinaryReader): UpsertConversationResponse;
}

export namespace UpsertConversationResponse {
  export type AsObject = {
    conversation?: Conversation.AsObject;
  };
}

export class UpdateConversationRequest extends jspb.Message {
  getConversationId(): string;
  setConversationId(value: string): UpdateConversationRequest;

  getUserId(): string;
  setUserId(value: string): UpdateConversationRequest;

  getTitle(): string;
  setTitle(value: string): UpdateConversationRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): UpdateConversationRequest.AsObject;
  static toObject(includeInstance: boolean, msg: UpdateConversationRequest): UpdateConversationRequest.AsObject;
  static serializeBinaryToWriter(message: UpdateConversationRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): UpdateConversationRequest;
  static deserializeBinaryFromReader(message: UpdateConversationRequest, reader: jspb.BinaryReader): UpdateConversationRequest;
}

export namespace UpdateConversationRequest {
  export type AsObject = {
    conversationId: string;
    userId: string;
    title: string;
  };
}

export class UpdateConversationResponse extends jspb.Message {
  getConversation(): Conversation | undefined;
  setConversation(value?: Conversation): UpdateConversationResponse;
  hasConversation(): boolean;
  clearConversation(): UpdateConversationResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): UpdateConversationResponse.AsObject;
  static toObject(includeInstance: boolean, msg: UpdateConversationResponse): UpdateConversationResponse.AsObject;
  static serializeBinaryToWriter(message: UpdateConversationResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): UpdateConversationResponse;
  static deserializeBinaryFromReader(message: UpdateConversationResponse, reader: jspb.BinaryReader): UpdateConversationResponse;
}

export namespace UpdateConversationResponse {
  export type AsObject = {
    conversation?: Conversation.AsObject;
  };
}

export class DeleteConversationsRequest extends jspb.Message {
  getUserId(): string;
  setUserId(value: string): DeleteConversationsRequest;

  getConversationIdsList(): Array<string>;
  setConversationIdsList(value: Array<string>): DeleteConversationsRequest;
  clearConversationIdsList(): DeleteConversationsRequest;
  addConversationIds(value: string, index?: number): DeleteConversationsRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): DeleteConversationsRequest.AsObject;
  static toObject(includeInstance: boolean, msg: DeleteConversationsRequest): DeleteConversationsRequest.AsObject;
  static serializeBinaryToWriter(message: DeleteConversationsRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): DeleteConversationsRequest;
  static deserializeBinaryFromReader(message: DeleteConversationsRequest, reader: jspb.BinaryReader): DeleteConversationsRequest;
}

export namespace DeleteConversationsRequest {
  export type AsObject = {
    userId: string;
    conversationIdsList: Array<string>;
  };
}

export class DeleteConversationsResponse extends jspb.Message {
  getDeletedCount(): number;
  setDeletedCount(value: number): DeleteConversationsResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): DeleteConversationsResponse.AsObject;
  static toObject(includeInstance: boolean, msg: DeleteConversationsResponse): DeleteConversationsResponse.AsObject;
  static serializeBinaryToWriter(message: DeleteConversationsResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): DeleteConversationsResponse;
  static deserializeBinaryFromReader(message: DeleteConversationsResponse, reader: jspb.BinaryReader): DeleteConversationsResponse;
}

export namespace DeleteConversationsResponse {
  export type AsObject = {
    deletedCount: number;
  };
}

export class GetConversationStatusRequest extends jspb.Message {
  getConversationId(): string;
  setConversationId(value: string): GetConversationStatusRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): GetConversationStatusRequest.AsObject;
  static toObject(includeInstance: boolean, msg: GetConversationStatusRequest): GetConversationStatusRequest.AsObject;
  static serializeBinaryToWriter(message: GetConversationStatusRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): GetConversationStatusRequest;
  static deserializeBinaryFromReader(message: GetConversationStatusRequest, reader: jspb.BinaryReader): GetConversationStatusRequest;
}

export namespace GetConversationStatusRequest {
  export type AsObject = {
    conversationId: string;
  };
}

export class GetConversationStatusResponse extends jspb.Message {
  getStatus(): TurnStatus;
  setStatus(value: TurnStatus): GetConversationStatusResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): GetConversationStatusResponse.AsObject;
  static toObject(includeInstance: boolean, msg: GetConversationStatusResponse): GetConversationStatusResponse.AsObject;
  static serializeBinaryToWriter(message: GetConversationStatusResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): GetConversationStatusResponse;
  static deserializeBinaryFromReader(message: GetConversationStatusResponse, reader: jspb.BinaryReader): GetConversationStatusResponse;
}

export namespace GetConversationStatusResponse {
  export type AsObject = {
    status: TurnStatus;
  };
}

export enum ConversationStatus {
  CONVERSATION_STATUS_UNSPECIFIED = 0,
  CONVERSATION_STATUS_OPEN = 1,
  CONVERSATION_STATUS_CLOSED = 2,
  CONVERSATION_STATUS_ARCHIVED = 3,
}
export enum MessageRole {
  MESSAGE_ROLE_UNSPECIFIED = 0,
  MESSAGE_ROLE_USER = 1,
  MESSAGE_ROLE_ASSISTANT = 2,
  MESSAGE_ROLE_SYSTEM = 3,
  MESSAGE_ROLE_TOOL = 4,
}
export enum TurnStatus {
  TURN_STATUS_UNSPECIFIED = 0,
  TURN_STATUS_NONE = 1,
  TURN_STATUS_PENDING = 2,
  TURN_STATUS_RUNNING = 3,
  TURN_STATUS_COMPLETED = 4,
  TURN_STATUS_FAILED = 5,
}
