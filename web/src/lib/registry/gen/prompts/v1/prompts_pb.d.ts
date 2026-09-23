import * as jspb from 'google-protobuf'



export class PromptSuggestion extends jspb.Message {
  getTopic(): PromptTopic;
  setTopic(value: PromptTopic): PromptSuggestion;

  getText(): string;
  setText(value: string): PromptSuggestion;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): PromptSuggestion.AsObject;
  static toObject(includeInstance: boolean, msg: PromptSuggestion): PromptSuggestion.AsObject;
  static serializeBinaryToWriter(message: PromptSuggestion, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): PromptSuggestion;
  static deserializeBinaryFromReader(message: PromptSuggestion, reader: jspb.BinaryReader): PromptSuggestion;
}

export namespace PromptSuggestion {
  export type AsObject = {
    topic: PromptTopic;
    text: string;
  };
}

export class ListPromptSuggestionsRequest extends jspb.Message {
  getTopicsList(): Array<PromptTopic>;
  setTopicsList(value: Array<PromptTopic>): ListPromptSuggestionsRequest;
  clearTopicsList(): ListPromptSuggestionsRequest;
  addTopics(value: PromptTopic, index?: number): ListPromptSuggestionsRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ListPromptSuggestionsRequest.AsObject;
  static toObject(includeInstance: boolean, msg: ListPromptSuggestionsRequest): ListPromptSuggestionsRequest.AsObject;
  static serializeBinaryToWriter(message: ListPromptSuggestionsRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ListPromptSuggestionsRequest;
  static deserializeBinaryFromReader(message: ListPromptSuggestionsRequest, reader: jspb.BinaryReader): ListPromptSuggestionsRequest;
}

export namespace ListPromptSuggestionsRequest {
  export type AsObject = {
    topicsList: Array<PromptTopic>;
  };
}

export class ListPromptSuggestionsResponse extends jspb.Message {
  getSuggestionsList(): Array<PromptSuggestion>;
  setSuggestionsList(value: Array<PromptSuggestion>): ListPromptSuggestionsResponse;
  clearSuggestionsList(): ListPromptSuggestionsResponse;
  addSuggestions(value?: PromptSuggestion, index?: number): PromptSuggestion;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ListPromptSuggestionsResponse.AsObject;
  static toObject(includeInstance: boolean, msg: ListPromptSuggestionsResponse): ListPromptSuggestionsResponse.AsObject;
  static serializeBinaryToWriter(message: ListPromptSuggestionsResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ListPromptSuggestionsResponse;
  static deserializeBinaryFromReader(message: ListPromptSuggestionsResponse, reader: jspb.BinaryReader): ListPromptSuggestionsResponse;
}

export namespace ListPromptSuggestionsResponse {
  export type AsObject = {
    suggestionsList: Array<PromptSuggestion.AsObject>;
  };
}

export enum PromptTopic {
  PROMPT_TOPIC_UNSPECIFIED = 0,
  PROMPT_TOPIC_GENERAL = 1,
  PROMPT_TOPIC_CHARGERS = 2,
  PROMPT_TOPIC_COMPARISON = 3,
}
